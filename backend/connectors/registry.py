from connectors.shopify import ShopifyConnector
from connectors.stripe import StripeConnector
from connectors.sql_base import SQLDatabaseConnector
from connectors.other_connectors import (
    WooCommerceConnector, ZohoBooksConnector, RazorpayConnector, AdAdsConnector, GA4Connector
)

def get_connector(source_type: str, config: dict):
    """
    Returns an instance of the specific connector for the given sourceType.
    """
    st = source_type.lower().strip()
    
    if st == "shopify":
        return ShopifyConnector(config)
    elif st == "stripe":
        return StripeConnector(config)
    elif st == "postgres" or st == "postgresql":
        return SQLDatabaseConnector(config, "postgres")
    elif st == "mysql":
        return SQLDatabaseConnector(config, "mysql")
    elif st == "woocommerce":
        return WooCommerceConnector(config)
    elif st == "zoho_books" or st == "zoho":
        return ZohoBooksConnector(config)
    elif st == "razorpay":
        return RazorpayConnector(config)
    elif st == "google_ads":
        return AdAdsConnector(config, "Google Ads")
    elif st == "meta_ads" or st == "facebook_ads":
        return AdAdsConnector(config, "Meta Ads")
    elif st == "ga4" or st == "google_analytics":
        return GA4Connector(config)
    else:
        raise ValueError(f"Unsupported connector integration: {source_type}")
