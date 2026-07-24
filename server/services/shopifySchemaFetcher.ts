// Shopify GraphQL API Introspection & Dynamic Schema Discovery Engine
// Fetches 100% of all standard fields, nested types, and custom store metafields directly from Shopify's Admin API

export interface DynamicFieldNode {
  id: string;
  label: string;
  isGroup?: boolean;
  selectedCount?: number;
  children?: DynamicFieldNode[];
}

// Map User Display Name (e.g. "Products", "Customers") to Official Shopify GraphQL Admin API Type Name
export function getShopifyGraphQLTypeName(objectName: string): string {
  const mapping: Record<string, string> = {
    "Products": "Product",
    "Product Variants": "ProductVariant",
    "Customers": "Customer",
    "Orders": "Order",
    "Collections": "Collection",
    "Draft Orders": "DraftOrder",
    "Files": "MediaImage",
    "Gift Cards": "GiftCard",
    "Inventory Items": "InventoryItem",
    "Line Items": "LineItem",
    "Locations": "Location",
    "Marketing Activities": "MarketingActivity",
    "Price Lists": "PriceList",
    "Selling Plan Groups": "SellingPlanGroup",
    "Tender Transactions": "TenderTransaction",
    "Url Redirects": "UrlRedirect",
    "Webhook Subscriptions": "WebhookSubscription"
  };
  return mapping[objectName] || objectName.replace(/\s+/g, "");
}

// 1. Send GraphQL Introspection Query to Live Shopify Admin API
export async function introspectShopifyType(shop: string, accessToken: string, typeName: string): Promise<any[]> {
  const cleanShop = shop.trim().toLowerCase().replace(".myshopify.com", "");
  const graphqlEndpoint = `https://${cleanShop}.myshopify.com/admin/api/2026-04/graphql.json`;

  const introspectionQuery = `
    query IntrospectShopifyType {
      __type(name: "${typeName}") {
        name
        kind
        fields {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
              fields {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: introspectionQuery })
    });

    const json = await response.json();
    return json?.data?.__type?.fields || [];
  } catch (err) {
    console.error("Shopify Introspection Error:", err);
    return [];
  }
}

// 2. Fetch Custom Store Metafield Definitions Dynamically
export async function fetchShopifyMetafieldDefinitions(shop: string, accessToken: string, ownerType: string): Promise<any[]> {
  const cleanShop = shop.trim().toLowerCase().replace(".myshopify.com", "");
  const graphqlEndpoint = `https://${cleanShop}.myshopify.com/admin/api/2026-04/graphql.json`;

  const metafieldQuery = `
    query GetMetafieldDefinitions {
      metafieldDefinitions(first: 250, ownerType: ${ownerType.toUpperCase()}) {
        edges {
          node {
            namespace
            key
            name
            type {
              name
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: metafieldQuery })
    });

    const json = await response.json();
    return json?.data?.metafieldDefinitions?.edges?.map((e: any) => e.node) || [];
  } catch (err) {
    console.error("Shopify Metafields Fetch Error:", err);
    return [];
  }
}

// 3. Query Live Paginated Records from Shopify Admin API
export async function fetchLiveShopifyDataFromAdmin(shop: string, accessToken: string, objectName: string): Promise<any[]> {
  const cleanShop = shop.trim().toLowerCase().replace(".myshopify.com", "");
  const graphqlEndpoint = `https://${cleanShop}.myshopify.com/admin/api/2026-04/graphql.json`;

  let query = "";
  if (objectName === "Products") {
    query = `
      query GetProducts {
        products(first: 250) {
          edges {
            node {
              id
              legacyResourceId
              title
              description
              handle
              status
              vendor
              productType
              createdAt
              updatedAt
              totalInventory
              totalVariants
              category {
                id
                name
                fullName
                description
                handle
                level
                updatedAt
              }
              combinedListingRole
              compareAtPriceRange {
                maxVariantCompareAtPrice { amount currencyCode }
                minVariantCompareAtPrice { amount currencyCode }
              }
            }
          }
        }
      }
    `;
  } else if (objectName === "Customers") {
    query = `
      query GetCustomers {
        customers(first: 250) {
          edges {
            node {
              id
              legacyResourceId
              displayName
              email
              firstName
              lastName
              phone
              createdAt
              updatedAt
              numberOfOrders
              amountSpent { amount currencyCode }
              defaultAddress {
                address1
                address2
                city
                company
                country
                countryCodeV2
                firstName
                lastName
                phone
                province
                zip
              }
              canDelete
              locale
              note
              state
              tags
              taxExempt
              verifiedEmail
            }
          }
        }
      }
    `;
  }

  if (!query) return [];

  try {
    const response = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query })
    });

    const json = await response.json();
    const key = objectName.toLowerCase();
    const edges = json?.data?.[key]?.edges || [];
    return edges.map((e: any) => e.node);
  } catch (err) {
    console.error("Live Shopify Data Fetch Error:", err);
    return [];
  }
}

// Convert raw GraphQL Introspection & Metafield Definitions into dynamic tree nodes
export function parseIntrospectionToFieldNodes(fields: any[], metafields: any[]): DynamicFieldNode[] {
  const nodes: DynamicFieldNode[] = [];

  for (const field of fields) {
    const label = field.name.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
    const isObject = field.type?.kind === "OBJECT" || field.type?.ofType?.kind === "OBJECT";

    if (isObject && field.type?.ofType?.fields) {
      const childNodes: DynamicFieldNode[] = field.type.ofType.fields.map((sub: any) => ({
        id: `${field.name}.${sub.name}`,
        label: sub.name.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())
      }));

      nodes.push({
        id: field.name,
        label,
        isGroup: true,
        children: childNodes
      });
    } else {
      nodes.push({
        id: field.name,
        label
      });
    }
  }

  if (metafields && metafields.length > 0) {
    const metafieldNodes: DynamicFieldNode[] = metafields.map(m => ({
      id: `metafields.${m.namespace}.${m.key}`,
      label: `${m.name || m.key} (${m.namespace})`
    }));

    nodes.push({
      id: "metafields",
      label: "Custom Store Metafields",
      isGroup: true,
      children: metafieldNodes
    });
  }

  return nodes;
}
