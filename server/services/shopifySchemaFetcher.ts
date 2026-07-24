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
          args {
            name
            type {
              kind
              name
            }
          }
          type {
            name
            kind
            fields {
              name
              type {
                name
                kind
              }
            }
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

export function getShopifyGraphQLConnectionName(objectName: string): string {
  const cleanName = objectName.trim();
  const mapping: Record<string, string> = {
    "Products": "products",
    "Product Variants": "productVariants",
    "Customers": "customers",
    "Orders": "orders",
    "Collections": "collections",
    "Draft Orders": "draftOrders",
    "Files": "files",
    "Gift Cards": "giftCards",
    "Inventory Items": "inventoryItems",
    "Line Items": "lineItems",
    "Locations": "locations",
    "Marketing Activities": "marketingActivities",
    "Price Lists": "priceLists",
    "Selling Plan Groups": "sellingPlanGroups",
    "Tender Transactions": "tenderTransactions",
    "Url Redirects": "urlRedirects",
    "Webhook Subscriptions": "webhookSubscriptions"
  };
  
  if (mapping[cleanName]) return mapping[cleanName];

  // Fallback to camelCase + pluralize
  let camel = cleanName.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, idx) => {
    return idx === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, "");

  if (!camel.endsWith("s")) {
    camel += "s";
  }
  return camel;
}

// 3. Query Live Paginated Records from Shopify Admin API
export async function fetchLiveShopifyDataFromAdmin(shop: string, accessToken: string, objectName: string): Promise<any[]> {
  const cleanShop = shop.trim().toLowerCase().replace(".myshopify.com", "");
  const graphqlEndpoint = `https://${cleanShop}.myshopify.com/admin/api/2026-04/graphql.json`;

  const connectionName = getShopifyGraphQLConnectionName(objectName);
  const typeName = getShopifyGraphQLTypeName(objectName);

  let selectionList = "";

  try {
    // 100% dynamic introspection: get available schema fields in real-time
    const fields = await introspectShopifyType(cleanShop, accessToken, typeName);

    if (fields && fields.length > 0) {
      const parts: string[] = [];

      const unwrapType = (type: any) => {
        let current = type;
        while (current && current.ofType) {
          current = current.ofType;
        }
        return current;
      };

      const getFieldsOfObjectType = (fieldType: any) => {
        if (fieldType?.fields) return fieldType.fields;
        if (fieldType?.ofType?.fields) return fieldType.ofType.fields;
        if (fieldType?.ofType?.ofType?.fields) return fieldType.ofType.ofType.fields;
        return null;
      };

      const isScalarOrEnum = (fieldType: any) => {
        const unwrapped = unwrapType(fieldType);
        if (!unwrapped) return false;
        const kind = unwrapped.kind;
        const name = unwrapped.name;
        const scalarTypes = ["String", "Int", "Float", "Boolean", "ID", "DateTime", "JSON", "Decimal", "Url", "HTML", "UnsignedInt64"];
        return kind === "SCALAR" || kind === "ENUM" || scalarTypes.includes(name);
      };

      const buildSelection = (f: any, depth = 0): string | null => {
        if (depth > 2) return null;
        if (f.args && f.args.length > 0) return null;

        const excludedNames = ["metafields", "privateMetafields", "translations", "events", "webhooks", "marketWebsites", "metafieldDefinitions"];
        if (excludedNames.includes(f.name)) return null;

        if (isScalarOrEnum(f.type)) {
          return f.name;
        }

        const unwrapped = unwrapType(f.type);
        if (unwrapped && unwrapped.kind === "OBJECT" && !unwrapped.name.endsWith("Connection")) {
          const subfields = getFieldsOfObjectType(f.type);
          if (subfields && subfields.length > 0) {
            const subSelections: string[] = [];
            for (const sub of subfields) {
              const sel = buildSelection(sub, depth + 1);
              if (sel) {
                subSelections.push(sel);
              }
            }
            if (subSelections.length > 0) {
              return `${f.name} { ${subSelections.join(" ")} }`;
            }
          }
        }
        return null;
      };

      for (const f of fields) {
        const sel = buildSelection(f, 0);
        if (sel) {
          parts.push(sel);
        }
      }

      if (parts.length > 0) {
        selectionList = parts.join(" ");
      }
    }
  } catch (err) {
    console.error("Dynamic Introspection failed, falling back to static config:", err);
  }

  // Fallbacks if introspection fails or returns empty query
  if (!selectionList) {
    if (objectName === "Products") {
      selectionList = `
        id legacyResourceId title description handle status vendor productType createdAt updatedAt totalInventory totalVariants
        category { id name fullName description handle level updatedAt }
        combinedListingRole
        compareAtPriceRange {
          maxVariantCompareAtPrice { amount currencyCode }
          minVariantCompareAtPrice { amount currencyCode }
        }
      `;
    } else if (objectName === "Customers") {
      selectionList = `
        id legacyResourceId displayName email firstName lastName phone createdAt updatedAt numberOfOrders
        amountSpent { amount currencyCode }
        defaultAddress { address1 address2 city company country countryCodeV2 firstName lastName phone province zip }
        canDelete locale note state tags taxExempt verifiedEmail
      `;
    } else {
      selectionList = "id name status createdAt updatedAt";
    }
  }

  const query = `
    query GetShopifyData {
      ${connectionName}(first: 250) {
        edges {
          node {
            ${selectionList}
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
      body: JSON.stringify({ query })
    });

    const json = await response.json();
    const edges = json?.data?.[connectionName]?.edges || [];
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
    const label = field.name.replace(/([A-Z])/g, " $1").replace(/^./, (str: string) => str.toUpperCase());
    const isObject = field.type?.kind === "OBJECT" || field.type?.ofType?.kind === "OBJECT";

    if (isObject && field.type?.ofType?.fields) {
      const childNodes: DynamicFieldNode[] = field.type.ofType.fields.map((sub: any) => ({
        id: `${field.name}.${sub.name}`,
        label: sub.name.replace(/([A-Z])/g, " $1").replace(/^./, (str: string) => str.toUpperCase())
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
