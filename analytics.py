#!/usr/bin/env python3
"""
VITAR Sport Analytics - Pohoda XML Order Analysis
Analyzes order exports from Pohoda by sales channel and salesperson.

Sales Channels:
- 112xxx = ESHOP_ENERVIT_CZ
- 122xxx = ESHOP_ENERVIT_SK
- 222xxx = ESHOP_ROYALBAY (CZ if CZK, SK if EUR)
- Others = B2B (subdivided by "Kdo řeší" / centre field)

B2B Salespeople:
- KPR = Karolina
- JGO = Jirka
- OJO/other = Štěpán
- Empty/unknown = VITAR Sport

Suppliers: VITAR, Aries (ROYALBAY), ENERVIT
"""

import xml.etree.ElementTree as ET
import os
import glob
from collections import defaultdict
from decimal import Decimal
import csv


# XML namespaces
NS = {
    'dat': 'http://www.stormware.cz/schema/version_2/data.xsd',
    'ord': 'http://www.stormware.cz/schema/version_2/order.xsd',
    'inv': 'http://www.stormware.cz/schema/version_2/invoice.xsd',
    'typ': 'http://www.stormware.cz/schema/version_2/type.xsd',
}


def get_text(element, xpath, default=''):
    """Safely get text from XML element."""
    el = element.find(xpath, NS)
    if el is not None and el.text:
        return el.text.strip()
    return default


def classify_order(order_number, currency, centre):
    """
    Classify order by sales channel based on order number prefix.

    Returns: (channel, salesperson, country, supplier)
    """
    order_str = str(order_number)

    # ESHOP_ENERVIT_CZ - 112xxx
    if order_str.startswith('112'):
        return ('ESHOP_ENERVIT_CZ', None, 'CZ', 'ENERVIT')

    # ESHOP_ENERVIT_SK - 122xxx
    if order_str.startswith('122'):
        return ('ESHOP_ENERVIT_SK', None, 'SK', 'ENERVIT')

    # ESHOP_ROYALBAY - 222xxx
    if order_str.startswith('222'):
        country = 'SK' if currency == 'EUR' else 'CZ'
        return (f'ESHOP_ROYALBAY_{country}', None, country, 'ARIES')

    # B2B - all other order numbers
    # Determine salesperson from centre field
    centre_upper = (centre or '').upper().strip()
    if centre_upper == 'KPR':
        salesperson = 'Karolina'
    elif centre_upper == 'JGO':
        salesperson = 'Jirka'
    elif centre_upper == 'OJO':
        salesperson = 'Štěpán'
    elif centre_upper:
        salesperson = 'Štěpán'  # Other known codes
    else:
        salesperson = 'VITAR Sport'

    # Determine country for B2B from currency
    country = 'SK' if currency == 'EUR' else 'CZ'

    return ('B2B', salesperson, country, 'VITAR')


def parse_order_items(order_element, order_info):
    """Parse order items and return list of item data."""
    items = []
    detail = order_element.find('.//ord:orderDetail', NS)

    if detail is None:
        return items

    for item in detail.findall('.//ord:orderItem', NS):
        product_name = get_text(item, './/ord:text')
        product_code = get_text(item, './/ord:code')
        quantity = Decimal(get_text(item, './/ord:quantity', '0'))
        delivered = Decimal(get_text(item, './/ord:delivered', '0'))
        unit = get_text(item, './/ord:unit')
        discount = Decimal(get_text(item, './/ord:discountPercentage', '0'))

        # Get EAN
        ean = get_text(item, './/ord:stockItem//typ:stockItem//typ:EAN')

        # Get price
        home_curr = item.find('.//ord:homeCurrency', NS)
        if home_curr is not None:
            unit_price = Decimal(get_text(home_curr, './/typ:unitPrice', '0'))
            price_without_vat = Decimal(get_text(home_curr, './/typ:price', '0'))  # bez DPH
            price_sum = Decimal(get_text(home_curr, './/typ:priceSum', '0'))  # s DPH
        else:
            unit_price = Decimal('0')
            price_without_vat = Decimal('0')
            price_sum = Decimal('0')

        # Skip items with no product code (like shipping, discounts)
        if not product_code:
            continue

        items.append({
            'order_number': order_info['order_number'],
            'date': order_info['date'],
            'company': order_info['company'],
            'currency': order_info['currency'],
            'channel': order_info['channel'],
            'salesperson': order_info['salesperson'],
            'country': order_info['country'],
            'supplier': order_info['supplier'],
            'product_code': product_code,
            'product_name': product_name,
            'ean': ean,
            'quantity': quantity,
            'delivered': delivered,
            'unit': unit,
            'unit_price': unit_price,
            'discount_percent': discount,
            'total_czk': price_sum if order_info['currency'] != 'EUR' else Decimal('0'),
            'total_czk_bez_dph': price_without_vat if order_info['currency'] != 'EUR' else Decimal('0'),
            'total_eur': Decimal('0'),
            'total_eur_bez_dph': Decimal('0'),
        })

    return items


def parse_order(order_element):
    """Parse a single order element and return order data."""
    header = order_element.find('.//ord:orderHeader', NS)
    summary = order_element.find('.//ord:orderSummary', NS)

    if header is None:
        return None, []

    # Get order number
    order_number = get_text(header, './/ord:numberOrder')
    internal_number = get_text(header, './/ord:number//typ:numberRequested')

    # Get dates
    order_date = get_text(header, './/ord:date')
    date_from = get_text(header, './/ord:dateFrom')
    date_to = get_text(header, './/ord:dateTo')

    # Get currency (check foreignCurrency for EUR)
    currency = 'CZK'
    foreign_currency_ids = None
    if summary is not None:
        foreign_curr = summary.find('.//ord:foreignCurrency//typ:currency//typ:ids', NS)
        if foreign_curr is not None and foreign_curr.text:
            foreign_currency_ids = foreign_curr.text.strip()
            if foreign_currency_ids == 'EUR':
                currency = 'EUR'

    # Get centre (Kdo řeší)
    centre = get_text(header, './/ord:centre//typ:ids')

    # Get customer info from partnerIdentity
    partner = header.find('.//ord:partnerIdentity', NS)
    company = ''
    customer_name = ''
    city = ''
    street = ''
    zip_code = ''
    customer_country = ''
    ico = ''
    dic = ''
    email = ''
    phone = ''

    if partner is not None:
        address = partner.find('.//typ:address', NS)
        if address is not None:
            company = get_text(address, './/typ:company')
            customer_name = get_text(address, './/typ:name')
            city = get_text(address, './/typ:city')
            street = get_text(address, './/typ:street')
            zip_code = get_text(address, './/typ:zip')
            customer_country = get_text(address, './/typ:country//typ:ids')
            ico = get_text(address, './/typ:ico')
            dic = get_text(address, './/typ:dic')
            email = get_text(address, './/typ:email')
            phone = get_text(address, './/typ:mobilPhone') or get_text(address, './/typ:phone')

    # Get payment type
    payment_type = get_text(header, './/ord:paymentType//typ:ids')

    # Get price level
    price_level = get_text(header, './/ord:priceLevel//typ:ids')

    # Get status flags
    is_executed = get_text(header, './/ord:isExecuted') == 'true'
    is_delivered = get_text(header, './/ord:isDelivered') == 'true'

    # Get notes
    note = get_text(header, './/ord:note')
    int_note = get_text(header, './/ord:intNote')

    # Get totals from summary - use foreignCurrency for EUR orders, homeCurrency for CZK
    total_czk = Decimal('0')
    total_czk_bez_dph = Decimal('0')
    total_eur = Decimal('0')
    total_eur_bez_dph = Decimal('0')

    if summary is not None:
        if currency == 'EUR':
            # For EUR orders, get the EUR amount from foreignCurrency
            foreign_curr_sum = summary.find('.//ord:foreignCurrency', NS)
            if foreign_curr_sum is not None:
                eur_sum = get_text(foreign_curr_sum, './/typ:priceSum', '0')
                total_eur = Decimal(eur_sum)
                # Get price without VAT for EUR
                eur_low = Decimal(get_text(foreign_curr_sum, './/typ:priceLow', '0'))
                eur_high = Decimal(get_text(foreign_curr_sum, './/typ:priceHigh', '0'))
                total_eur_bez_dph = eur_low + eur_high
            # Also get CZK equivalent from homeCurrency
            home_curr = summary.find('.//ord:homeCurrency', NS)
            if home_curr is not None:
                price_none = Decimal(get_text(home_curr, './/typ:priceNone', '0'))
                price_low = Decimal(get_text(home_curr, './/typ:priceLowSum', '0'))
                price_high = Decimal(get_text(home_curr, './/typ:priceHighSum', '0'))
                total_czk = price_none + price_low + price_high
        else:
            # For CZK orders
            home_curr = summary.find('.//ord:homeCurrency', NS)
            if home_curr is not None:
                # With VAT (priceSum = priceLowSum + priceHighSum)
                price_low_sum = Decimal(get_text(home_curr, './/typ:priceLowSum', '0'))
                price_high_sum = Decimal(get_text(home_curr, './/typ:priceHighSum', '0'))
                total_czk = price_low_sum + price_high_sum
                # Without VAT (price = priceLow + priceHigh)
                price_low = Decimal(get_text(home_curr, './/typ:priceLow', '0'))
                price_high = Decimal(get_text(home_curr, './/typ:priceHigh', '0'))
                total_czk_bez_dph = price_low + price_high

    # Classify order
    channel, salesperson, country, supplier = classify_order(order_number, currency, centre)

    order_data = {
        'order_number': order_number,
        'internal_number': internal_number,
        'date': order_date,
        'date_from': date_from,
        'date_to': date_to,
        'company': company,
        'customer_name': customer_name,
        'city': city,
        'street': street,
        'zip': zip_code,
        'customer_country': customer_country,
        'ico': ico,
        'dic': dic,
        'email': email,
        'phone': phone,
        'currency': currency,
        'centre': centre,
        'channel': channel,
        'salesperson': salesperson,
        'country': country,
        'supplier': supplier,
        'payment_type': payment_type,
        'price_level': price_level,
        'is_executed': is_executed,
        'is_delivered': is_delivered,
        'note': note,
        'int_note': int_note,
        'total_czk': total_czk,
        'total_czk_bez_dph': total_czk_bez_dph,
        'total_eur': total_eur,
        'total_eur_bez_dph': total_eur_bez_dph,
    }

    # Parse order items
    items = parse_order_items(order_element, order_data)

    return order_data, items


# ============================================================================
# INVOICE PARSING FUNCTIONS
# ============================================================================

def parse_invoice_items(invoice_element, invoice_info):
    """Parse invoice items and return list of item data."""
    items = []
    detail = invoice_element.find('.//inv:invoiceDetail', NS)

    if detail is None:
        return items

    for item in detail.findall('.//inv:invoiceItem', NS):
        product_name = get_text(item, './/inv:text')
        product_code = get_text(item, './/inv:code')
        quantity = Decimal(get_text(item, './/inv:quantity', '0'))
        unit = get_text(item, './/inv:unit')
        discount = Decimal(get_text(item, './/inv:discountPercentage', '0'))

        # Get EAN
        ean = get_text(item, './/inv:stockItem//typ:stockItem//typ:EAN')

        # Get price from homeCurrency
        home_curr = item.find('.//inv:homeCurrency', NS)
        if home_curr is not None:
            unit_price = Decimal(get_text(home_curr, './/typ:unitPrice', '0'))
            price_without_vat = Decimal(get_text(home_curr, './/typ:price', '0'))  # bez DPH
            price_sum = Decimal(get_text(home_curr, './/typ:priceSum', '0'))  # s DPH
        else:
            unit_price = Decimal('0')
            price_without_vat = Decimal('0')
            price_sum = Decimal('0')

        # Get EUR price if available
        foreign_curr = item.find('.//inv:foreignCurrency', NS)
        price_sum_eur = Decimal('0')
        price_without_vat_eur = Decimal('0')
        if foreign_curr is not None:
            price_without_vat_eur = Decimal(get_text(foreign_curr, './/typ:price', '0'))  # bez DPH
            price_sum_eur = Decimal(get_text(foreign_curr, './/typ:priceSum', '0'))  # s DPH

        # Skip items with no product code (like shipping, discounts)
        if not product_code:
            continue

        items.append({
            'invoice_number': invoice_info['invoice_number'],
            'order_number': invoice_info['order_number'],
            'date': invoice_info['date'],
            'company': invoice_info['company'],
            'currency': invoice_info['currency'],
            'channel': invoice_info['channel'],
            'salesperson': invoice_info['salesperson'],
            'country': invoice_info['country'],
            'supplier': invoice_info['supplier'],
            'product_code': product_code,
            'product_name': product_name,
            'ean': ean,
            'quantity': quantity,
            'unit': unit,
            'unit_price': unit_price,
            'discount_percent': discount,
            'total_czk': price_sum if invoice_info['currency'] != 'EUR' else Decimal('0'),
            'total_czk_bez_dph': price_without_vat if invoice_info['currency'] != 'EUR' else Decimal('0'),
            'total_eur': price_sum_eur if invoice_info['currency'] == 'EUR' else Decimal('0'),
            'total_eur_bez_dph': price_without_vat_eur if invoice_info['currency'] == 'EUR' else Decimal('0'),
        })

    return items


def parse_invoice(invoice_element):
    """Parse a single invoice element and return invoice data."""
    header = invoice_element.find('.//inv:invoiceHeader', NS)
    summary = invoice_element.find('.//inv:invoiceSummary', NS)

    if header is None:
        return None, []

    # Get invoice number
    invoice_number = get_text(header, './/inv:number//typ:numberRequested')
    sym_var = get_text(header, './/inv:symVar')

    # Get linked order number
    order_number = get_text(header, './/inv:numberOrder')

    # Get dates
    invoice_date = get_text(header, './/inv:date')
    date_tax = get_text(header, './/inv:dateTax')
    date_due = get_text(header, './/inv:dateDue')

    # Get currency (check foreignCurrency for EUR)
    currency = 'CZK'
    if summary is not None:
        foreign_curr = summary.find('.//inv:foreignCurrency//typ:currency//typ:ids', NS)
        if foreign_curr is not None and foreign_curr.text:
            if foreign_curr.text.strip() == 'EUR':
                currency = 'EUR'

    # Get centre (Kdo řeší) - invoices might not have this, use order number prefix
    centre = get_text(header, './/inv:centre//typ:ids')

    # Get customer info from partnerIdentity
    partner = header.find('.//inv:partnerIdentity', NS)
    company = ''
    customer_name = ''
    city = ''
    street = ''
    zip_code = ''
    customer_country = ''
    ico = ''
    dic = ''
    email = ''
    phone = ''

    if partner is not None:
        address = partner.find('.//typ:address', NS)
        if address is not None:
            company = get_text(address, './/typ:company')
            customer_name = get_text(address, './/typ:name')
            city = get_text(address, './/typ:city')
            street = get_text(address, './/typ:street')
            zip_code = get_text(address, './/typ:zip')
            customer_country = get_text(address, './/typ:country//typ:ids')
            ico = get_text(address, './/typ:ico')
            dic = get_text(address, './/typ:dic')
            email = get_text(address, './/typ:email')
            phone = get_text(address, './/typ:mobilPhone') or get_text(address, './/typ:phone')

    # Get payment type
    payment_type = get_text(header, './/inv:paymentType//typ:ids')

    # Get price level (important for identifying Sponzoring)
    price_level = get_text(header, './/inv:priceLevel//typ:ids')

    # Get accounting info
    accounting = get_text(header, './/inv:accounting//typ:ids')

    # Check if paid (liquidation date exists)
    liquidation_date = get_text(header, './/inv:liquidation//typ:date')
    is_paid = bool(liquidation_date)

    # Get totals from summary
    total_czk = Decimal('0')
    total_czk_bez_dph = Decimal('0')
    total_eur = Decimal('0')
    total_eur_bez_dph = Decimal('0')

    if summary is not None:
        if currency == 'EUR':
            # For EUR invoices, get the EUR amount from foreignCurrency
            foreign_curr_sum = summary.find('.//inv:foreignCurrency', NS)
            if foreign_curr_sum is not None:
                eur_sum = get_text(foreign_curr_sum, './/typ:priceSum', '0')
                total_eur = Decimal(eur_sum)
                # Get price without VAT for EUR
                eur_low = Decimal(get_text(foreign_curr_sum, './/typ:priceLow', '0'))
                eur_high = Decimal(get_text(foreign_curr_sum, './/typ:priceHigh', '0'))
                total_eur_bez_dph = eur_low + eur_high
            # Also get CZK equivalent from homeCurrency
            home_curr = summary.find('.//inv:homeCurrency', NS)
            if home_curr is not None:
                price_none = Decimal(get_text(home_curr, './/typ:priceNone', '0'))
                price_low = Decimal(get_text(home_curr, './/typ:priceLowSum', '0'))
                price_high = Decimal(get_text(home_curr, './/typ:priceHighSum', '0'))
                total_czk = price_none + price_low + price_high
        else:
            # For CZK invoices
            home_curr = summary.find('.//inv:homeCurrency', NS)
            if home_curr is not None:
                # With VAT
                price_none = Decimal(get_text(home_curr, './/typ:priceNone', '0'))
                price_low_sum = Decimal(get_text(home_curr, './/typ:priceLowSum', '0'))
                price_high_sum = Decimal(get_text(home_curr, './/typ:priceHighSum', '0'))
                total_czk = price_none + price_low_sum + price_high_sum
                # Without VAT
                price_low = Decimal(get_text(home_curr, './/typ:priceLow', '0'))
                price_high = Decimal(get_text(home_curr, './/typ:priceHigh', '0'))
                total_czk_bez_dph = price_none + price_low + price_high

    # Classify invoice based on order number (same logic as orders)
    channel, salesperson, country, supplier = classify_order(order_number, currency, centre)

    invoice_data = {
        'invoice_number': invoice_number,
        'sym_var': sym_var,
        'order_number': order_number,
        'date': invoice_date,
        'date_tax': date_tax,
        'date_due': date_due,
        'company': company,
        'customer_name': customer_name,
        'city': city,
        'street': street,
        'zip': zip_code,
        'customer_country': customer_country,
        'ico': ico,
        'dic': dic,
        'email': email,
        'phone': phone,
        'currency': currency,
        'centre': centre,
        'channel': channel,
        'salesperson': salesperson,
        'country': country,
        'supplier': supplier,
        'payment_type': payment_type,
        'price_level': price_level,
        'accounting': accounting,
        'is_paid': is_paid,
        'liquidation_date': liquidation_date,
        'total_czk': total_czk,
        'total_czk_bez_dph': total_czk_bez_dph,
        'total_eur': total_eur,
        'total_eur_bez_dph': total_eur_bez_dph,
    }

    # Parse invoice items
    items = parse_invoice_items(invoice_element, invoice_data)

    return invoice_data, items


def parse_invoice_xml_file(filepath):
    """Parse a Pohoda XML invoice export file and return list of invoices and items."""
    invoices = []
    all_items = []

    # Read file with correct encoding
    with open(filepath, 'rb') as f:
        content = f.read()

    # Try to parse
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        print(f"Error parsing {filepath}: {e}")
        return invoices, all_items

    # Find all invoices
    for invoice in root.findall('.//inv:invoice', NS):
        invoice_data, items = parse_invoice(invoice)
        if invoice_data:
            invoices.append(invoice_data)
            all_items.extend(items)

    return invoices, all_items


def analyze_invoices(xml_dir):
    """Analyze all invoice XML files in directory."""
    all_invoices = []
    all_items = []

    # Parse all XML files
    xml_files = sorted(glob.glob(os.path.join(xml_dir, '*.xml')))

    for filepath in xml_files:
        filename = os.path.basename(filepath)
        print(f"Processing {filename}...")
        invoices, items = parse_invoice_xml_file(filepath)
        all_invoices.extend(invoices)
        all_items.extend(items)
        print(f"  Found {len(invoices)} invoices, {len(items)} items")

    print(f"\nTotal invoices: {len(all_invoices)}")
    print(f"Total items: {len(all_items)}")

    return all_invoices, all_items


def export_invoices_to_js(invoices, items, output_dir):
    """Export invoice data to JavaScript files for web dashboard."""
    import json

    # Separate regular invoices from sponsoring
    regular_invoices = [inv for inv in invoices if inv['price_level'] != 'Sponzoring']
    sponsoring_invoices = [inv for inv in invoices if inv['price_level'] == 'Sponzoring']

    # Get invoice numbers for filtering items
    regular_inv_numbers = set(inv['invoice_number'] for inv in regular_invoices)
    sponsoring_inv_numbers = set(inv['invoice_number'] for inv in sponsoring_invoices)

    regular_items = [item for item in items if item['invoice_number'] in regular_inv_numbers]
    sponsoring_items = [item for item in items if item['invoice_number'] in sponsoring_inv_numbers]

    def invoice_to_dict(inv):
        return {
            'invoice_number': inv['invoice_number'],
            'order_number': inv['order_number'],
            'date': inv['date'],
            'date_due': inv['date_due'],
            'company': inv['company'],
            'customer_name': inv['customer_name'],
            'city': inv['city'],
            'zip': inv['zip'],
            'customer_country': inv['customer_country'],
            'ico': inv['ico'],
            'email': inv['email'],
            'phone': inv['phone'],
            'currency': inv['currency'],
            'centre': inv['centre'],
            'channel': inv['channel'],
            'salesperson': inv['salesperson'] if inv['salesperson'] else None,
            'country': inv['country'],
            'supplier': inv['supplier'],
            'payment_type': inv['payment_type'],
            'price_level': inv['price_level'],
            'is_paid': inv['is_paid'],
            'liquidation_date': inv['liquidation_date'],
            'total_czk': float(inv['total_czk']),
            'total_czk_bez_dph': float(inv.get('total_czk_bez_dph', 0)),
            'total_eur': float(inv['total_eur']),
            'total_eur_bez_dph': float(inv.get('total_eur_bez_dph', 0))
        }

    def item_to_dict(item):
        return {
            'invoice_number': item['invoice_number'],
            'order_number': item['order_number'],
            'date': item['date'],
            'company': item['company'],
            'currency': item['currency'],
            'channel': item['channel'],
            'salesperson': item['salesperson'] if item['salesperson'] else None,
            'country': item['country'],
            'supplier': item['supplier'],
            'product_code': item['product_code'],
            'product_name': item['product_name'],
            'ean': item['ean'],
            'quantity': float(item['quantity']),
            'unit': item['unit'],
            'unit_price': float(item['unit_price']),
            'discount_percent': float(item['discount_percent']),
            'total_czk': float(item['total_czk']),
            'total_czk_bez_dph': float(item.get('total_czk_bez_dph', 0)),
            'total_eur': float(item['total_eur']),
            'total_eur_bez_dph': float(item.get('total_eur_bez_dph', 0)),
        }

    # Export regular invoices
    invoices_file = os.path.join(output_dir, 'invoices_data.js')
    invoices_list = [invoice_to_dict(inv) for inv in regular_invoices]

    with open(invoices_file, 'w', encoding='utf-8') as f:
        f.write('// VITAR Sport Analytics - Invoices Data (excluding Sponzoring)\n')
        f.write('// Generated from Pohoda XML exports\n\n')
        f.write('const invoicesData = ')
        f.write(json.dumps(invoices_list, ensure_ascii=False, indent=2))
        f.write(';\n')
    print(f"Exported {len(invoices_list)} regular invoices to: {invoices_file}")

    # Export regular invoice items
    items_file = os.path.join(output_dir, 'invoices_items.js')
    items_list = [item_to_dict(item) for item in regular_items]

    with open(items_file, 'w', encoding='utf-8') as f:
        f.write('// VITAR Sport Analytics - Invoice Items Data (excluding Sponzoring)\n')
        f.write('// Generated from Pohoda XML exports\n\n')
        f.write('const invoiceItemsData = ')
        f.write(json.dumps(items_list, ensure_ascii=False, indent=2))
        f.write(';\n')
    print(f"Exported {len(items_list)} regular invoice items to: {items_file}")

    # Export sponsoring invoices
    sponsoring_file = os.path.join(output_dir, 'sponsoring_data.js')
    sponsoring_list = [invoice_to_dict(inv) for inv in sponsoring_invoices]

    with open(sponsoring_file, 'w', encoding='utf-8') as f:
        f.write('// VITAR Sport Analytics - Sponsoring Invoices Data\n')
        f.write('// Generated from Pohoda XML exports\n\n')
        f.write('const sponsoringData = ')
        f.write(json.dumps(sponsoring_list, ensure_ascii=False, indent=2))
        f.write(';\n')
    print(f"Exported {len(sponsoring_list)} sponsoring invoices to: {sponsoring_file}")

    # Export sponsoring items
    sponsoring_items_file = os.path.join(output_dir, 'sponsoring_items.js')
    sponsoring_items_list = [item_to_dict(item) for item in sponsoring_items]

    with open(sponsoring_items_file, 'w', encoding='utf-8') as f:
        f.write('// VITAR Sport Analytics - Sponsoring Items Data\n')
        f.write('// Generated from Pohoda XML exports\n\n')
        f.write('const sponsoringItemsData = ')
        f.write(json.dumps(sponsoring_items_list, ensure_ascii=False, indent=2))
        f.write(';\n')
    print(f"Exported {len(sponsoring_items_list)} sponsoring items to: {sponsoring_items_file}")


# ============================================================================
# ORDER PARSING FUNCTIONS (existing)
# ============================================================================

def parse_xml_file(filepath):
    """Parse a Pohoda XML export file and return list of orders and items."""
    orders = []
    all_items = []

    # Read file with correct encoding
    with open(filepath, 'rb') as f:
        content = f.read()

    # Try to parse
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        print(f"Error parsing {filepath}: {e}")
        return orders, all_items

    # Find all orders
    for order in root.findall('.//ord:order', NS):
        order_data, items = parse_order(order)
        if order_data:
            orders.append(order_data)
            all_items.extend(items)

    return orders, all_items


def analyze_orders(xml_dir):
    """Analyze all XML files in directory and generate reports."""
    all_orders = []
    all_items = []

    # Parse all XML files
    xml_files = sorted(glob.glob(os.path.join(xml_dir, '*.xml')))

    for filepath in xml_files:
        filename = os.path.basename(filepath)
        print(f"Processing {filename}...")
        orders, items = parse_xml_file(filepath)
        all_orders.extend(orders)
        all_items.extend(items)
        print(f"  Found {len(orders)} orders, {len(items)} items")

    print(f"\nTotal orders: {len(all_orders)}")
    print(f"Total items: {len(all_items)}")

    return all_orders, all_items


def generate_reports(orders):
    """Generate various analytics reports."""

    # Monthly totals by channel (CZK)
    monthly_channel_czk = defaultdict(lambda: defaultdict(Decimal))
    # Monthly totals by channel (EUR) - for SK markets
    monthly_channel_eur = defaultdict(lambda: defaultdict(Decimal))

    # Monthly totals by salesperson (for B2B) - CZK
    monthly_salesperson_czk = defaultdict(lambda: defaultdict(Decimal))

    # Monthly totals by supplier (CZK)
    monthly_supplier_czk = defaultdict(lambda: defaultdict(Decimal))

    # Order counts
    monthly_channel_count = defaultdict(lambda: defaultdict(int))
    monthly_salesperson_count = defaultdict(lambda: defaultdict(int))

    for order in orders:
        month = order['date'][:7] if order['date'] else 'Unknown'
        channel = order['channel']
        total_czk = order['total_czk']
        total_eur = order['total_eur']
        currency = order['currency']

        # Track by currency
        if currency == 'EUR':
            monthly_channel_eur[month][channel] += total_eur
        else:
            monthly_channel_czk[month][channel] += total_czk

        monthly_channel_count[month][channel] += 1

        if channel == 'B2B':
            salesperson = order['salesperson']
            monthly_salesperson_czk[month][salesperson] += total_czk
            monthly_salesperson_count[month][salesperson] += 1

        monthly_supplier_czk[month][order['supplier']] += total_czk

    return {
        'monthly_channel_czk': dict(monthly_channel_czk),
        'monthly_channel_eur': dict(monthly_channel_eur),
        'monthly_channel_count': dict(monthly_channel_count),
        'monthly_salesperson_czk': dict(monthly_salesperson_czk),
        'monthly_salesperson_count': dict(monthly_salesperson_count),
        'monthly_supplier_czk': dict(monthly_supplier_czk),
    }


def format_czk(amount):
    """Format amount in CZK."""
    return f"{amount:,.2f} Kč".replace(',', ' ').replace('.', ',')


def format_eur(amount):
    """Format amount in EUR."""
    return f"{amount:,.2f} €".replace(',', ' ').replace('.', ',')


def print_reports(reports):
    """Print formatted reports to console."""

    months = sorted(set(list(reports['monthly_channel_czk'].keys()) + list(reports['monthly_channel_eur'].keys())))

    # CZ MARKET (CZK)
    print("\n" + "="*100)
    print("CZ MARKET - MĚSÍČNÍ PŘEHLED (CZK)")
    print("="*100)

    channels_cz = ['ESHOP_ENERVIT_CZ', 'ESHOP_ROYALBAY_CZ', 'B2B']

    print(f"\n{'Měsíc':<12}", end='')
    for ch in channels_cz:
        print(f"{ch:>25}", end='')
    print(f"{'CZ CELKEM':>25}")
    print("-" * (12 + 25*len(channels_cz) + 25))

    grand_totals_cz = defaultdict(Decimal)

    for month in months:
        print(f"{month:<12}", end='')
        month_total = Decimal('0')
        for ch in channels_cz:
            amount = reports['monthly_channel_czk'].get(month, {}).get(ch, Decimal('0'))
            grand_totals_cz[ch] += amount
            month_total += amount
            print(f"{format_czk(amount):>25}", end='')
        print(f"{format_czk(month_total):>25}")

    print("-" * (12 + 25*len(channels_cz) + 25))
    print(f"{'CELKEM':<12}", end='')
    total_cz = Decimal('0')
    for ch in channels_cz:
        total_cz += grand_totals_cz[ch]
        print(f"{format_czk(grand_totals_cz[ch]):>25}", end='')
    print(f"{format_czk(total_cz):>25}")

    # SK MARKET (EUR)
    print("\n" + "="*100)
    print("SK MARKET - MĚSÍČNÍ PŘEHLED (EUR)")
    print("="*100)

    channels_sk = ['ESHOP_ENERVIT_SK', 'ESHOP_ROYALBAY_SK', 'B2B']

    print(f"\n{'Měsíc':<12}", end='')
    for ch in channels_sk:
        print(f"{ch:>25}", end='')
    print(f"{'SK CELKEM':>25}")
    print("-" * (12 + 25*len(channels_sk) + 25))

    grand_totals_sk = defaultdict(Decimal)

    for month in months:
        print(f"{month:<12}", end='')
        month_total = Decimal('0')
        for ch in channels_sk:
            amount = reports['monthly_channel_eur'].get(month, {}).get(ch, Decimal('0'))
            grand_totals_sk[ch] += amount
            month_total += amount
            print(f"{format_eur(amount):>25}", end='')
        print(f"{format_eur(month_total):>25}")

    print("-" * (12 + 25*len(channels_sk) + 25))
    print(f"{'CELKEM':<12}", end='')
    total_sk = Decimal('0')
    for ch in channels_sk:
        total_sk += grand_totals_sk[ch]
        print(f"{format_eur(grand_totals_sk[ch]):>25}", end='')
    print(f"{format_eur(total_sk):>25}")

    # B2B breakdown by salesperson (CZK only since B2B is CZ market)
    print("\n" + "="*100)
    print("B2B PODLE OBCHODNÍKA (CZK)")
    print("="*100)

    salespeople = ['Karolina', 'Jirka', 'Štěpán', 'VITAR Sport']

    print(f"\n{'Měsíc':<12}", end='')
    for sp in salespeople:
        print(f"{sp:>22}", end='')
    print(f"{'B2B CELKEM':>22}")
    print("-" * (12 + 22*len(salespeople) + 22))

    sp_totals = defaultdict(Decimal)

    for month in months:
        print(f"{month:<12}", end='')
        month_total = Decimal('0')
        for sp in salespeople:
            amount = reports['monthly_salesperson_czk'].get(month, {}).get(sp, Decimal('0'))
            sp_totals[sp] += amount
            month_total += amount
            print(f"{format_czk(amount):>22}", end='')
        print(f"{format_czk(month_total):>22}")

    print("-" * (12 + 22*len(salespeople) + 22))
    print(f"{'CELKEM':<12}", end='')
    total_b2b = Decimal('0')
    for sp in salespeople:
        total_b2b += sp_totals[sp]
        print(f"{format_czk(sp_totals[sp]):>22}", end='')
    print(f"{format_czk(total_b2b):>22}")

    # By supplier (CZK)
    print("\n" + "="*100)
    print("PODLE DODAVATELE (CZK)")
    print("="*100)

    suppliers = ['ENERVIT', 'ARIES', 'VITAR']

    print(f"\n{'Měsíc':<12}", end='')
    for sup in suppliers:
        print(f"{sup:>25}", end='')
    print(f"{'CELKEM':>25}")
    print("-" * (12 + 25*len(suppliers) + 25))

    sup_totals = defaultdict(Decimal)

    for month in months:
        print(f"{month:<12}", end='')
        month_total = Decimal('0')
        for sup in suppliers:
            amount = reports['monthly_supplier_czk'].get(month, {}).get(sup, Decimal('0'))
            sup_totals[sup] += amount
            month_total += amount
            print(f"{format_czk(amount):>25}", end='')
        print(f"{format_czk(month_total):>25}")

    print("-" * (12 + 25*len(suppliers) + 25))
    print(f"{'CELKEM':<12}", end='')
    total_sup = Decimal('0')
    for sup in suppliers:
        total_sup += sup_totals[sup]
        print(f"{format_czk(sup_totals[sup]):>25}", end='')
    print(f"{format_czk(total_sup):>25}")

    # Order counts
    all_channels = ['ESHOP_ENERVIT_CZ', 'ESHOP_ENERVIT_SK', 'ESHOP_ROYALBAY_CZ', 'ESHOP_ROYALBAY_SK', 'B2B']

    print("\n" + "="*120)
    print("POČET OBJEDNÁVEK PODLE KANÁLU")
    print("="*120)

    print(f"\n{'Měsíc':<12}", end='')
    for ch in all_channels:
        print(f"{ch:>20}", end='')
    print(f"{'CELKEM':>20}")
    print("-" * (12 + 20*len(all_channels) + 20))

    count_totals = defaultdict(int)

    for month in months:
        print(f"{month:<12}", end='')
        month_total = 0
        for ch in all_channels:
            count = reports['monthly_channel_count'].get(month, {}).get(ch, 0)
            count_totals[ch] += count
            month_total += count
            print(f"{count:>20}", end='')
        print(f"{month_total:>20}")

    print("-" * (12 + 20*len(all_channels) + 20))
    print(f"{'CELKEM':<12}", end='')
    total_count = 0
    for ch in all_channels:
        total_count += count_totals[ch]
        print(f"{count_totals[ch]:>20}", end='')
    print(f"{total_count:>20}")


def export_to_csv(orders, reports, output_dir):
    """Export data to CSV files."""

    months = sorted(set(list(reports['monthly_channel_czk'].keys()) + list(reports['monthly_channel_eur'].keys())))

    # Export all orders
    orders_file = os.path.join(output_dir, 'all_orders.csv')
    with open(orders_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'order_number', 'internal_number', 'date', 'date_from', 'date_to',
            'company', 'customer_name', 'city', 'street', 'zip', 'customer_country',
            'ico', 'dic', 'email', 'phone', 'currency', 'centre',
            'channel', 'salesperson', 'country', 'supplier',
            'payment_type', 'price_level', 'is_executed', 'is_delivered',
            'note', 'int_note', 'total_czk', 'total_czk_bez_dph', 'total_eur', 'total_eur_bez_dph'
        ])
        writer.writeheader()
        for order in orders:
            row = order.copy()
            row['total_czk'] = float(row['total_czk'])
            row['total_czk_bez_dph'] = float(row.get('total_czk_bez_dph', 0))
            row['total_eur'] = float(row['total_eur'])
            row['total_eur_bez_dph'] = float(row.get('total_eur_bez_dph', 0))
            writer.writerow(row)
    print(f"\nExported orders to: {orders_file}")

    # Export CZ market summary (CZK)
    summary_cz_file = os.path.join(output_dir, 'monthly_summary_CZ_CZK.csv')
    channels_cz = ['ESHOP_ENERVIT_CZ', 'ESHOP_ROYALBAY_CZ', 'B2B']

    with open(summary_cz_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Měsíc'] + channels_cz + ['CZ CELKEM (CZK)'])
        for month in months:
            row = [month]
            total = Decimal('0')
            for ch in channels_cz:
                amount = reports['monthly_channel_czk'].get(month, {}).get(ch, Decimal('0'))
                row.append(float(amount))
                total += amount
            row.append(float(total))
            writer.writerow(row)
    print(f"Exported CZ summary to: {summary_cz_file}")

    # Export SK market summary (EUR)
    summary_sk_file = os.path.join(output_dir, 'monthly_summary_SK_EUR.csv')
    channels_sk = ['ESHOP_ENERVIT_SK', 'ESHOP_ROYALBAY_SK', 'B2B']

    with open(summary_sk_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Měsíc'] + channels_sk + ['SK CELKEM (EUR)'])
        for month in months:
            row = [month]
            total = Decimal('0')
            for ch in channels_sk:
                amount = reports['monthly_channel_eur'].get(month, {}).get(ch, Decimal('0'))
                row.append(float(amount))
                total += amount
            row.append(float(total))
            writer.writerow(row)
    print(f"Exported SK summary to: {summary_sk_file}")

    # Export B2B by salesperson (CZK)
    b2b_file = os.path.join(output_dir, 'b2b_by_salesperson.csv')
    salespeople = ['Karolina', 'Jirka', 'Štěpán', 'VITAR Sport']

    with open(b2b_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Měsíc'] + salespeople + ['B2B CELKEM (CZK)'])
        for month in months:
            row = [month]
            total = Decimal('0')
            for sp in salespeople:
                amount = reports['monthly_salesperson_czk'].get(month, {}).get(sp, Decimal('0'))
                row.append(float(amount))
                total += amount
            row.append(float(total))
            writer.writerow(row)
    print(f"Exported B2B breakdown to: {b2b_file}")


def export_to_js(orders, items, output_dir):
    """Export data to JavaScript files for web dashboard."""
    import json

    # Export orders
    orders_file = os.path.join(output_dir, 'data.js')
    orders_list = []
    for order in orders:
        orders_list.append({
            'order_number': order['order_number'],
            'internal_number': order['internal_number'],
            'date': order['date'],
            'company': order['company'],
            'customer_name': order['customer_name'],
            'city': order['city'],
            'zip': order['zip'],
            'customer_country': order['customer_country'],
            'ico': order['ico'],
            'email': order['email'],
            'phone': order['phone'],
            'currency': order['currency'],
            'centre': order['centre'],
            'channel': order['channel'],
            'salesperson': order['salesperson'] if order['salesperson'] else None,
            'country': order['country'],
            'supplier': order['supplier'],
            'payment_type': order['payment_type'],
            'price_level': order['price_level'],
            'is_executed': order['is_executed'],
            'is_delivered': order['is_delivered'],
            'total_czk': float(order['total_czk']),
            'total_czk_bez_dph': float(order.get('total_czk_bez_dph', 0)),
            'total_eur': float(order['total_eur']),
            'total_eur_bez_dph': float(order.get('total_eur_bez_dph', 0))
        })

    with open(orders_file, 'w', encoding='utf-8') as f:
        f.write('// VITAR Sport Analytics - Orders Data\n')
        f.write('// Generated from Pohoda XML exports\n\n')
        f.write('const ordersData = ')
        f.write(json.dumps(orders_list, ensure_ascii=False, indent=2))
        f.write(';\n')
    print(f"Exported {len(orders_list)} orders to: {orders_file}")

    # Export items
    items_file = os.path.join(output_dir, 'items.js')
    items_list = []
    for item in items:
        items_list.append({
            'order_number': item['order_number'],
            'date': item['date'],
            'company': item['company'],
            'currency': item['currency'],
            'channel': item['channel'],
            'salesperson': item['salesperson'] if item['salesperson'] else None,
            'country': item['country'],
            'supplier': item['supplier'],
            'product_code': item['product_code'],
            'product_name': item['product_name'],
            'ean': item['ean'],
            'quantity': float(item['quantity']),
            'delivered': float(item['delivered']),
            'unit': item['unit'],
            'unit_price': float(item['unit_price']),
            'discount_percent': float(item['discount_percent']),
            'total_czk': float(item['total_czk']),
            'total_czk_bez_dph': float(item.get('total_czk_bez_dph', 0)),
            'total_eur': float(item.get('total_eur', 0)),
            'total_eur_bez_dph': float(item.get('total_eur_bez_dph', 0)),
        })

    with open(items_file, 'w', encoding='utf-8') as f:
        f.write('// VITAR Sport Analytics - Order Items Data\n')
        f.write('// Generated from Pohoda XML exports\n\n')
        f.write('const itemsData = ')
        f.write(json.dumps(items_list, ensure_ascii=False, indent=2))
        f.write(';\n')
    print(f"Exported {len(items_list)} items to: {items_file}")


def main():
    """Main entry point."""
    # Directory with XML exports
    script_dir = os.path.dirname(os.path.abspath(__file__))
    xml_dir = os.path.join(script_dir, 'xml-exports')

    if not os.path.exists(xml_dir):
        print(f"Error: XML directory not found: {xml_dir}")
        return

    # Check for subdirectories (new structure)
    orders_dir = os.path.join(xml_dir, 'objednavky')
    invoices_dir = os.path.join(xml_dir, 'faktury')

    print("VITAR Sport Analytics - Pohoda XML Analysis")
    print("="*50)

    # ========================================
    # PROCESS ORDERS
    # ========================================
    if os.path.exists(orders_dir):
        print("\n" + "="*50)
        print("OBJEDNÁVKY (Orders)")
        print("="*50)

        orders, order_items = analyze_orders(orders_dir)

        if orders:
            # Generate reports
            reports = generate_reports(orders)

            # Print reports
            print_reports(reports)

            # Export to CSV
            export_to_csv(orders, reports, script_dir)

            # Export to JavaScript for web dashboard
            export_to_js(orders, order_items, script_dir)
        else:
            print("No orders found!")
    else:
        print(f"Orders directory not found: {orders_dir}")

    # ========================================
    # PROCESS INVOICES
    # ========================================
    if os.path.exists(invoices_dir):
        print("\n" + "="*50)
        print("FAKTÚRY (Invoices)")
        print("="*50)

        invoices, invoice_items = analyze_invoices(invoices_dir)

        if invoices:
            # Export invoices to JavaScript for web dashboard
            export_invoices_to_js(invoices, invoice_items, script_dir)
        else:
            print("No invoices found!")
    else:
        print(f"Invoices directory not found: {invoices_dir}")

    print("\n" + "="*50)
    print("Analýza dokončena!")


if __name__ == '__main__':
    main()
