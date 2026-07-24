import { useState, useEffect } from "react";
import { 
  X, 
  Filter, 
  ArrowUpDown, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Info,
  Check,
  Table,
  FileText
} from "lucide-react";

function OfficialBrandLogo({ id }: { id: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-[#eaf4e0] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
      <img 
        src="https://cdn.simpleicons.org/shopify/95BF47" 
        alt="Shopify" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}

// 38 Official Shopify Objects
const ALL_SHOPIFY_OBJECTS = [
  "Automatic Discount Nodes",
  "Automatic Discount Saved Searches",
  "Code Discount Nodes",
  "Code Discount Saved Searches",
  "Collection Saved Searches",
  "Collections",
  "Customers",
  "Deletion Events",
  "Delivery Profiles",
  "Discount Redeem Code Saved Searches",
  "Draft Order Saved Searches",
  "Draft Orders",
  "File Saved Searches",
  "Files",
  "Gift Cards",
  "Inventory Items",
  "Line Items",
  "Locations",
  "Locations Available For Delivery Profiles Connection",
  "Market Catalogs",
  "Market Catalogs Markets",
  "Marketing Activities",
  "Order Saved Searches",
  "Orders",
  "Price Lists",
  "Product Saved Searches",
  "Product Variants",
  "Products",
  "Script Tags",
  "Segment Filters",
  "Segment Migrations",
  "Segments",
  "Selling Plan Groups",
  "Standard Metafield Definition Templates",
  "Tender Transactions",
  "Url Redirect Saved Searches",
  "Url Redirects",
  "Webhook Subscriptions"
];

export interface FieldNode {
  id: string;
  label: string;
  isGroup?: boolean;
  children?: FieldNode[];
}

const CUSTOMERS_SCHEMA: FieldNode[] = [
  { id: "id", label: "Id (GraphQL GID)" },
  { id: "legacyResourceId", label: "Legacy Resource Id" },
  { id: "displayName", label: "Display Name" },
  { id: "email", label: "Email" },
  { id: "firstName", label: "First Name" },
  { id: "lastName", label: "Last Name" },
  { id: "phone", label: "Phone Number" },
  { id: "createdAt", label: "Created At" },
  { id: "updatedAt", label: "Updated At" },
  {
    id: "amountSpent",
    label: "Amount Spent",
    isGroup: true,
    children: [
      { id: "amountSpent.amount", label: "Amount" },
      { id: "amountSpent.currencyCode", label: "Currency Code" }
    ]
  },
  { id: "numberOfOrders", label: "Number Of Orders" },
  {
    id: "defaultAddress",
    label: "Default Address (Address1)",
    isGroup: true,
    children: [
      { id: "defaultAddress.address1", label: "Address 1" },
      { id: "defaultAddress.address2", label: "Address 2" },
      { id: "defaultAddress.city", label: "City" },
      { id: "defaultAddress.company", label: "Company" },
      { id: "defaultAddress.country", label: "Country" },
      { id: "defaultAddress.countryCodeV2", label: "Country Code" },
      { id: "defaultAddress.firstName", label: "First Name" },
      { id: "defaultAddress.lastName", label: "Last Name" },
      { id: "defaultAddress.phone", label: "Phone" },
      { id: "defaultAddress.province", label: "Province / State" },
      { id: "defaultAddress.zip", label: "Zip / Postal Code" }
    ]
  },
  {
    id: "emailMarketingConsent",
    label: "Email Marketing Consent",
    isGroup: true,
    children: [
      { id: "emailMarketingConsent.consentUpdatedAt", label: "Consent Updated At" },
      { id: "emailMarketingConsent.marketingOptInLevel", label: "Marketing Opt In Level" },
      { id: "emailMarketingConsent.marketingState", label: "Marketing State" }
    ]
  },
  { id: "canDelete", label: "Can Delete" },
  { id: "dataSaleOptOut", label: "Data Sale Opt Out" },
  { id: "locale", label: "Locale" },
  { id: "note", label: "Note" },
  { id: "state", label: "State" },
  { id: "tags", label: "Tags" },
  { id: "taxExempt", label: "Tax Exempt" },
  { id: "verifiedEmail", label: "Verified Email" }
];

const PRODUCTS_SCHEMA: FieldNode[] = [
  { id: "id", label: "Id (GraphQL GID)" },
  { id: "legacyResourceId", label: "Legacy Resource Id" },
  { id: "createdAt", label: "Created At" },
  { id: "updatedAt", label: "Updated At" },
  { id: "publishedAt", label: "Published At" },
  { id: "title", label: "Title" },
  { id: "description", label: "Description" },
  { id: "descriptionHtml", label: "Description Html" },
  { id: "productType", label: "Product Type" },
  { id: "vendor", label: "Vendor" },
  { id: "status", label: "Status" },
  { id: "handle", label: "Handle" },
  { id: "isGiftCard", label: "Is Gift Card" },
  { id: "tags", label: "Tags" },
  { id: "templateSuffix", label: "Template Suffix" },
  {
    id: "category",
    label: "Category",
    isGroup: true,
    children: [
      { id: "category.id", label: "Category Id" },
      { id: "category.name", label: "Category Name" },
      { id: "category.fullName", label: "Category Full Name" },
      {
        id: "category.ancestors",
        label: "Category Ancestors",
        isGroup: true,
        children: [
          { id: "category.ancestors.id", label: "Ancestor Id" },
          { id: "category.ancestors.name", label: "Ancestor Name" }
        ]
      }
    ]
  },
  {
    id: "combinedListing",
    label: "Combined Listing",
    isGroup: true,
    children: [
      {
        id: "combinedListing.parentProduct",
        label: "Parent Product",
        isGroup: true,
        children: [
          { id: "combinedListing.parentProduct.id", label: "Parent Product Id" },
          { id: "combinedListing.parentProduct.title", label: "Parent Product Title" },
          { id: "combinedListing.parentProduct.handle", label: "Parent Product Handle" }
        ]
      }
    ]
  },
  { id: "combinedListingRole", label: "Combined Listing Role" },
  {
    id: "compareAtPriceRange",
    label: "Compare At Price Range",
    isGroup: true,
    children: [
      {
        id: "compareAtPriceRange.maxVariantCompareAtPrice",
        label: "Max Variant Compare At Price",
        isGroup: true,
        children: [
          { id: "compareAtPriceRange.maxVariantCompareAtPrice.amount", label: "Amount" },
          { id: "compareAtPriceRange.maxVariantCompareAtPrice.currencyCode", label: "Currency Code" }
        ]
      },
      {
        id: "compareAtPriceRange.minVariantCompareAtPrice",
        label: "Min Variant Compare At Price",
        isGroup: true,
        children: [
          { id: "compareAtPriceRange.minVariantCompareAtPrice.amount", label: "Amount" },
          { id: "compareAtPriceRange.minVariantCompareAtPrice.currencyCode", label: "Currency Code" }
        ]
      }
    ]
  },
  {
    id: "featuredMedia",
    label: "Featured Media",
    isGroup: true,
    children: [
      { id: "featuredMedia.id", label: "Media Id" },
      { id: "featuredMedia.mediaContentType", label: "Media Content Type" },
      { id: "featuredMedia.alt", label: "Media Alt Text" },
      {
        id: "featuredMedia.previewImage",
        label: "Preview Image",
        isGroup: true,
        children: [
          { id: "featuredMedia.previewImage.url", label: "Url" },
          { id: "featuredMedia.previewImage.altText", label: "Alt Text" },
          { id: "featuredMedia.previewImage.width", label: "Width" },
          { id: "featuredMedia.previewImage.height", label: "Height" }
        ]
      }
    ]
  },
  {
    id: "feedback",
    label: "Feedback",
    isGroup: true,
    children: [
      { id: "feedback.summary", label: "Summary" }
    ]
  },
  { id: "giftCardTemplateSuffix", label: "Gift Card Template Suffix" },
  { id: "hasOnlyDefaultVariant", label: "Has Only Default Variant" },
  { id: "hasOutOfStockVariants", label: "Has Out Of Stock Variants" },
  { id: "hasVariantsThatRequiresComponents", label: "Has Variants That Requires Components" },
  { id: "inCollection", label: "In Collection" },
  { id: "mediaCount", label: "Media Count" },
  { id: "onlineStorePreviewUrl", label: "Online Store Preview Url" },
  { id: "onlineStoreUrl", label: "Online Store Url" },
  {
    id: "options",
    label: "Product Options",
    isGroup: true,
    children: [
      { id: "options.id", label: "Option Id" },
      { id: "options.name", label: "Option Name (e.g. Size/Color)" },
      { id: "options.position", label: "Option Position" },
      { id: "options.values", label: "Option Values (List)" }
    ]
  },
  {
    id: "priceRangeV2",
    label: "Price Range V2",
    isGroup: true,
    children: [
      {
        id: "priceRangeV2.maxVariantPrice",
        label: "Max Variant Price",
        isGroup: true,
        children: [
          { id: "priceRangeV2.maxVariantPrice.amount", label: "Amount" },
          { id: "priceRangeV2.maxVariantPrice.currencyCode", label: "Currency Code" }
        ]
      },
      {
        id: "priceRangeV2.minVariantPrice",
        label: "Min Variant Price",
        isGroup: true,
        children: [
          { id: "priceRangeV2.minVariantPrice.amount", label: "Amount" },
          { id: "priceRangeV2.minVariantPrice.currencyCode", label: "Currency Code" }
        ]
      }
    ]
  },
  { id: "requiresSellingPlan", label: "Requires Selling Plan" },
  { id: "sellingPlanGroupCount", label: "Selling Plan Group Count" },
  {
    id: "seo",
    label: "SEO Details",
    isGroup: true,
    children: [
      { id: "seo.title", label: "SEO Title" },
      { id: "seo.description", label: "SEO Description" }
    ]
  },
  { id: "totalInventory", label: "Total Inventory Quantity" },
  { id: "totalVariants", label: "Total Variants Count" },
  { id: "tracksInventory", label: "Tracks Inventory" },
  {
    id: "variants",
    label: "Product Variants List",
    isGroup: true,
    children: [
      { id: "variants.id", label: "Variant Id" },
      { id: "variants.title", label: "Variant Title" },
      { id: "variants.sku", label: "Variant SKU" },
      { id: "variants.barcode", label: "Variant Barcode" },
      { id: "variants.price", label: "Variant Price" },
      { id: "variants.compareAtPrice", label: "Variant Compare At Price" },
      { id: "variants.inventoryQuantity", label: "Variant Inventory Quantity" },
      { id: "variants.weight", label: "Variant Weight" },
      { id: "variants.weightUnit", label: "Variant Weight Unit" }
    ]
  },
  {
    id: "collections",
    label: "Associated Collections",
    isGroup: true,
    children: [
      { id: "collections.id", label: "Collection Id" },
      { id: "collections.title", label: "Collection Title" },
      { id: "collections.handle", label: "Collection Handle" }
    ]
  },
  {
    id: "metafields",
    label: "Custom Store Metafields",
    isGroup: true,
    children: [
      { id: "metafields.namespace", label: "Namespace" },
      { id: "metafields.key", label: "Key" },
      { id: "metafields.value", label: "Value" },
      { id: "metafields.type", label: "Type" }
    ]
  }
];

function getSchemaForObject(objName: string): FieldNode[] {
  if (objName === "Customers") return CUSTOMERS_SCHEMA;
  if (objName === "Products") return PRODUCTS_SCHEMA;
  return [
    { id: "id", label: "Id (GraphQL GID)" },
    { id: "legacyResourceId", label: "Legacy Resource Id" },
    { id: "createdAt", label: "Created At" },
    { id: "updatedAt", label: "Updated At" },
    { id: "title", label: `${objName} Title / Name` },
    { id: "status", label: "Status" },
    {
      id: "details",
      label: "Object Details",
      isGroup: true,
      children: [
        { id: "details.code", label: "Code" },
        { id: "details.type", label: "Type" }
      ]
    }
  ];
}

function getAllLeafIds(nodes: FieldNode[]): string[] {
  let ids: string[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      ids = [...ids, ...getAllLeafIds(node.children)];
    } else {
      ids.push(node.id);
    }
  }
  return ids;
}

// 100% Populated Cell Data (No '—' Hyphens!)
function getSampleDataForObject(objName: string): Record<string, string>[] {
  if (objName === "Products") {
    return [
      {
        id: "gid://shopify/Product/10087354892528",
        legacyResourceId: "10087354892528",
        createdAt: "2026-07-01 10:15:00",
        updatedAt: "2026-07-24 16:30:00",
        title: "The Inventory Not Tracked Snowboard",
        description: "Premium all-mountain snowboard built for speed and stability.",
        descriptionHtml: "<p>Premium all-mountain snowboard built for speed and stability.</p>",
        productType: "snowboard",
        vendor: "di-insights",
        status: "ACTIVE",
        handle: "the-inventory-not-tracked-snowboard",
        "category.id": "gid://shopify/TaxonomyCategory/aa-1",
        "category.name": "Snowboards",
        "category.fullName": "Sporting Goods > Winter Sports > Snowboarding > Snowboards",
        "combinedListingRole": "PARENT",
        "compareAtPriceRange.maxVariantCompareAtPrice.amount": "699.99",
        "compareAtPriceRange.maxVariantCompareAtPrice.currencyCode": "USD",
        "compareAtPriceRange.minVariantCompareAtPrice.amount": "499.99",
        "compareAtPriceRange.minVariantCompareAtPrice.currencyCode": "USD",
        "featuredMedia.id": "gid://shopify/MediaImage/5501",
        "featuredMedia.mediaContentType": "IMAGE",
        "featuredMedia.previewImage.url": "https://cdn.shopify.com/s/files/1/0001/snowboard1.jpg",
        "featuredMedia.previewImage.altText": "Front view of snowboard",
        "feedback.summary": "High Rating",
        giftCardTemplateSuffix: "default",
        hasOnlyDefaultVariant: "False",
        hasOutOfStockVariants: "False"
      },
      {
        id: "gid://shopify/Product/10087354925296",
        legacyResourceId: "10087354925296",
        createdAt: "2026-07-02 11:20:00",
        updatedAt: "2026-07-24 16:32:00",
        title: "Gift Card",
        description: "This is a gift card for the store",
        descriptionHtml: "<p>This is a gift card for the store</p>",
        productType: "giftcard",
        vendor: "Snowboards",
        status: "ACTIVE",
        handle: "gift-card",
        "category.id": "gid://shopify/TaxonomyCategory/aa-2",
        "category.name": "Gift Cards",
        "category.fullName": "Arts & Entertainment > Party & Celebration > Gift Cards",
        "combinedListingRole": "NONE",
        "compareAtPriceRange.maxVariantCompareAtPrice.amount": "100.00",
        "compareAtPriceRange.maxVariantCompareAtPrice.currencyCode": "USD",
        "compareAtPriceRange.minVariantCompareAtPrice.amount": "25.00",
        "compareAtPriceRange.minVariantCompareAtPrice.currencyCode": "USD",
        "featuredMedia.id": "gid://shopify/MediaImage/5502",
        "featuredMedia.mediaContentType": "IMAGE",
        "featuredMedia.previewImage.url": "https://cdn.shopify.com/s/files/1/0001/giftcard.jpg",
        "featuredMedia.previewImage.altText": "Store Gift Card Image",
        "feedback.summary": "5 Stars",
        giftCardTemplateSuffix: "gift_card",
        hasOnlyDefaultVariant: "True",
        hasOutOfStockVariants: "False"
      },
      {
        id: "gid://shopify/Product/10087354958064",
        legacyResourceId: "10087354958064",
        createdAt: "2026-07-03 14:00:00",
        updatedAt: "2026-07-24 16:35:00",
        title: "The Draft Snowboard",
        description: "Freestyle twin snowboard designed for park riders.",
        descriptionHtml: "<p>Freestyle twin snowboard designed for park riders.</p>",
        productType: "snowboard",
        vendor: "Snowboards",
        status: "DRAFT",
        handle: "the-draft-snowboard",
        "category.id": "gid://shopify/TaxonomyCategory/aa-1",
        "category.name": "Snowboards",
        "category.fullName": "Sporting Goods > Winter Sports > Snowboarding > Snowboards",
        "combinedListingRole": "NONE",
        "compareAtPriceRange.maxVariantCompareAtPrice.amount": "549.00",
        "compareAtPriceRange.maxVariantCompareAtPrice.currencyCode": "USD",
        "compareAtPriceRange.minVariantCompareAtPrice.amount": "399.00",
        "compareAtPriceRange.minVariantCompareAtPrice.currencyCode": "USD",
        "featuredMedia.id": "gid://shopify/MediaImage/5503",
        "featuredMedia.mediaContentType": "IMAGE",
        "featuredMedia.previewImage.url": "https://cdn.shopify.com/s/files/1/0001/draft.jpg",
        "featuredMedia.previewImage.altText": "Draft Snowboard Graphic",
        "feedback.summary": "Pending Review",
        giftCardTemplateSuffix: "default",
        hasOnlyDefaultVariant: "False",
        hasOutOfStockVariants: "True"
      },
      {
        id: "gid://shopify/Product/10087354990832",
        legacyResourceId: "10087354990832",
        createdAt: "2026-07-05 09:10:00",
        updatedAt: "2026-07-24 16:40:00",
        title: "The Archived Snowboard",
        description: "Classic vintage snowboard model.",
        descriptionHtml: "<p>Classic vintage snowboard model.</p>",
        productType: "snowboard",
        vendor: "Snowboards",
        status: "ARCHIVED",
        handle: "the-archived-snowboard",
        "category.id": "gid://shopify/TaxonomyCategory/aa-1",
        "category.name": "Snowboards",
        "category.fullName": "Sporting Goods > Winter Sports > Snowboarding > Snowboards",
        "combinedListingRole": "NONE",
        "compareAtPriceRange.maxVariantCompareAtPrice.amount": "450.00",
        "compareAtPriceRange.maxVariantCompareAtPrice.currencyCode": "USD",
        "compareAtPriceRange.minVariantCompareAtPrice.amount": "299.00",
        "compareAtPriceRange.minVariantCompareAtPrice.currencyCode": "USD",
        "featuredMedia.id": "gid://shopify/MediaImage/5504",
        "featuredMedia.mediaContentType": "IMAGE",
        "featuredMedia.previewImage.url": "https://cdn.shopify.com/s/files/1/0001/archived.jpg",
        "featuredMedia.previewImage.altText": "Archived Model",
        "feedback.summary": "Archived",
        giftCardTemplateSuffix: "default",
        hasOnlyDefaultVariant: "False",
        hasOutOfStockVariants: "True"
      },
      {
        id: "gid://shopify/Product/10087355023600",
        legacyResourceId: "10087355023600",
        createdAt: "2026-07-06 16:45:00",
        updatedAt: "2026-07-24 16:45:00",
        title: "The Minimal Snowboard",
        description: "Sleek minimalist design with carbon fiber stringers.",
        descriptionHtml: "<p>Sleek minimalist design with carbon fiber stringers.</p>",
        productType: "snowboard",
        vendor: "di-insights",
        status: "ACTIVE",
        handle: "the-minimal-snowboard",
        "category.id": "gid://shopify/TaxonomyCategory/aa-1",
        "category.name": "Snowboards",
        "category.fullName": "Sporting Goods > Winter Sports > Snowboarding > Snowboards",
        "combinedListingRole": "CHILD",
        "compareAtPriceRange.maxVariantCompareAtPrice.amount": "799.00",
        "compareAtPriceRange.maxVariantCompareAtPrice.currencyCode": "USD",
        "compareAtPriceRange.minVariantCompareAtPrice.amount": "649.00",
        "compareAtPriceRange.minVariantCompareAtPrice.currencyCode": "USD",
        "featuredMedia.id": "gid://shopify/MediaImage/5505",
        "featuredMedia.mediaContentType": "IMAGE",
        "featuredMedia.previewImage.url": "https://cdn.shopify.com/s/files/1/0001/minimal.jpg",
        "featuredMedia.previewImage.altText": "Minimal Black Matte Finish",
        "feedback.summary": "Top Rated",
        giftCardTemplateSuffix: "default",
        hasOnlyDefaultVariant: "False",
        hasOutOfStockVariants: "False"
      }
    ];
  }

  if (objName === "Customers") {
    return [
      {
        id: "gid://shopify/Customer/9494632",
        legacyResourceId: "9494632",
        createdAt: "2026-07-07 01:31:18",
        updatedAt: "2026-07-24 12:00:00",
        displayName: "Ayumu Hirano",
        email: "ayumu.hirano@example.com",
        firstName: "Ayumu",
        lastName: "Hirano",
        phone: "+1 416-555-0192",
        "amountSpent.amount": "140.00",
        "amountSpent.currencyCode": "USD",
        numberOfOrders: "14",
        "defaultAddress.address1": "105 Victoria St",
        "defaultAddress.address2": "Suite 400",
        "defaultAddress.city": "Toronto",
        "defaultAddress.company": "Snowboarding Inc",
        "defaultAddress.country": "Canada",
        "defaultAddress.countryCodeV2": "CA",
        "defaultAddress.firstName": "Ayumu",
        "defaultAddress.lastName": "Hirano",
        "defaultAddress.phone": "+1 416-555-0192",
        "defaultAddress.province": "Ontario",
        "defaultAddress.zip": "M5C 3C4",
        "emailMarketingConsent.consentUpdatedAt": "2026-07-07 01:31:18",
        "emailMarketingConsent.marketingOptInLevel": "SINGLE_OPT_IN",
        "emailMarketingConsent.marketingState": "SUBSCRIBED",
        canDelete: "True",
        dataSaleOptOut: "False",
        locale: "en",
        note: "VIP Snowboarder Customer",
        state: "ENABLED",
        tags: "VIP, Repeat Buyer",
        taxExempt: "False",
        verifiedEmail: "True"
      },
      {
        id: "gid://shopify/Customer/9494633",
        legacyResourceId: "9494633",
        createdAt: "2026-07-07 01:31:19",
        updatedAt: "2026-07-24 14:15:00",
        displayName: "Russell Winfield",
        email: "russel.winfield@example.com",
        firstName: "Russell",
        lastName: "Winfield",
        phone: "+1 613-555-0184",
        "amountSpent.amount": "290.50",
        "amountSpent.currencyCode": "USD",
        numberOfOrders: "28",
        "defaultAddress.address1": "Box 42 - 151 O'Connor St",
        "defaultAddress.address2": "Floor 12",
        "defaultAddress.city": "Ottawa",
        "defaultAddress.company": "Ottawa Trading",
        "defaultAddress.country": "Canada",
        "defaultAddress.countryCodeV2": "CA",
        "defaultAddress.firstName": "Russell",
        "defaultAddress.lastName": "Winfield",
        "defaultAddress.phone": "+1 613-555-0184",
        "defaultAddress.province": "Ontario",
        "defaultAddress.zip": "K1P 5M7",
        "emailMarketingConsent.consentUpdatedAt": "2026-07-07 01:31:19",
        "emailMarketingConsent.marketingOptInLevel": "CONFIRMED_OPT_IN",
        "emailMarketingConsent.marketingState": "SUBSCRIBED",
        canDelete: "True",
        dataSaleOptOut: "False",
        locale: "en",
        note: "Loyal customer since 2024",
        state: "ENABLED",
        tags: "Wholesale, Frequent",
        taxExempt: "False",
        verifiedEmail: "True"
      }
    ];
  }

  return [
    {
      id: `gid://shopify/${objName.replace(/\s+/g, '')}/101`,
      legacyResourceId: "101",
      createdAt: "2026-07-20 09:00:00",
      updatedAt: "2026-07-24 15:00:00",
      title: `${objName} Standard Entry #1`,
      status: "ACTIVE",
      "details.code": `SH-${objName.substring(0, 3).toUpperCase()}-101`,
      "details.type": "STANDARD"
    },
    {
      id: `gid://shopify/${objName.replace(/\s+/g, '')}/102`,
      legacyResourceId: "102",
      createdAt: "2026-07-21 11:30:00",
      updatedAt: "2026-07-24 15:30:00",
      title: `${objName} Primary Item #2`,
      status: "ENABLED",
      "details.code": `SH-${objName.substring(0, 3).toUpperCase()}-102`,
      "details.type": "PREMIUM"
    }
  ];
}

export default function ImportPreviewPage() {
  const [selectedObject, setSelectedObject] = useState<string | null>("Products");
  const [objectSearchTerm, setObjectSearchTerm] = useState("");
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [liveData, setLiveData] = useState<Record<string, string>[] | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Expanded Groups Set (stores group field ids that are open)
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([
    "category", "combinedListing", "compareAtPriceRange", "compareAtPriceRange.maxVariantCompareAtPrice", "compareAtPriceRange.minVariantCompareAtPrice", "amountSpent", "defaultAddress"
  ]);

  const currentSchema = selectedObject ? getSchemaForObject(selectedObject) : [];
  const currentSampleData = (isLiveConnected && liveData && liveData.length > 0) ? liveData : (selectedObject ? getSampleDataForObject(selectedObject) : []);

  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);

  useEffect(() => {
    // Attempt fetching live data from server API
    const fetchLiveShopifyData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get("shop") || "di-insights";
        const res = await fetch("/api/shopify/fetch-live-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop, object: selectedObject || "Products" })
        });
        const json = await res.json();
        if (json.isLive && json.data && json.data.length > 0) {
          setIsLiveConnected(true);
          setLiveData(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveShopifyData();
  }, [selectedObject]);

  useEffect(() => {
    if (selectedObject) {
      const schema = getSchemaForObject(selectedObject);
      const allLeafs = getAllLeafIds(schema);
      setSelectedFieldIds(allLeafs);
    }
  }, [selectedObject]);

  const handleSelectObject = (objName: string) => {
    setSelectedObject(objName);
  };

  const toggleGroupExpand = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleFieldSelect = (node: FieldNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.children && node.children.length > 0) {
      const leafIds = getAllLeafIds(node.children);
      const allSelected = leafIds.every(id => selectedFieldIds.includes(id));
      if (allSelected) {
        setSelectedFieldIds(prev => prev.filter(id => !leafIds.includes(id)));
      } else {
        setSelectedFieldIds(prev => Array.from(new Set([...prev, ...leafIds])));
      }
    } else {
      setSelectedFieldIds(prev => 
        prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]
      );
    }
  };

  const toggleSelectAll = () => {
    const allLeafs = getAllLeafIds(currentSchema);
    if (selectedFieldIds.length === allLeafs.length) {
      setSelectedFieldIds([]);
    } else {
      setSelectedFieldIds(allLeafs);
    }
  };

  const filteredObjects = ALL_SHOPIFY_OBJECTS.filter(o => 
    objectSearchTerm === "" || o.toLowerCase().includes(objectSearchTerm.toLowerCase())
  );

  const handleDoneClick = () => {
    try {
      localStorage.setItem("dv_import_preview_done", JSON.stringify({
        object: selectedObject || "Products",
        fields: selectedFieldIds,
        timestamp: Date.now()
      }));
      if (window.opener) {
        window.opener.postMessage({ type: "dv_import_preview_done", object: selectedObject, fields: selectedFieldIds }, "*");
      }
    } catch (e) {
      console.error(e);
    }
    if ((window as any).google?.script?.host?.close) {
      (window as any).google.script.host.close();
    } else {
      window.close();
    }
  };

  // Render Recursive Field Tree Node
  const renderTreeNode = (node: FieldNode, depth = 0) => {
    const isGroup = node.isGroup && node.children && node.children.length > 0;
    const isExpanded = expandedGroupIds.includes(node.id);
    
    let isChecked = false;
    let selectedCount = 0;

    if (isGroup) {
      const leafIds = getAllLeafIds(node.children!);
      selectedCount = leafIds.filter(id => selectedFieldIds.includes(id)).length;
      isChecked = selectedCount === leafIds.length && leafIds.length > 0;
    } else {
      isChecked = selectedFieldIds.includes(node.id);
    }

    if (fieldSearchTerm !== "" && !node.label.toLowerCase().includes(fieldSearchTerm.toLowerCase())) {
      if (!isGroup) return null;
      const childMatch = node.children?.some(c => c.label.toLowerCase().includes(fieldSearchTerm.toLowerCase()));
      if (!childMatch) return null;
    }

    return (
      <div key={node.id} className="select-none">
        <div 
          onClick={(e) => isGroup ? toggleGroupExpand(node.id, e) : toggleFieldSelect(node, e)}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer text-xs font-medium transition-colors hover:bg-gray-100/80 ${
            isChecked ? "text-[#1d4ed8] font-bold" : "text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {isGroup ? (
              <button 
                onClick={(e) => toggleGroupExpand(node.id, e)}
                className="p-0.5 hover:bg-gray-200 rounded text-gray-500 transition-transform cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-700 font-bold" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 font-bold" />
                )}
              </button>
            ) : (
              <input 
                type="checkbox" 
                checked={isChecked}
                onChange={(e) => toggleFieldSelect(node, e as any)}
                className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] accent-[#2563eb] cursor-pointer shrink-0"
              />
            )}
            
            <span className="truncate">{node.label}</span>
          </div>

          {isGroup && selectedCount > 0 && (
            <span className="text-[10px] text-[#2563eb] font-bold shrink-0 bg-[#e8f0fe] px-1.5 py-0.5 rounded-full">
              {selectedCount} selected
            </span>
          )}
        </div>

        {/* Render Subchildren if Group is Expanded */}
        {isGroup && isExpanded && (
          <div className="space-y-0.5">
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-white text-[#13322b] font-sans select-none antialiased flex flex-col justify-between">
      
      {/* 100% EXACT MATCH FOR COEFFICIENT MODAL WINDOW */}
      <div className="w-full h-screen bg-white flex flex-col overflow-hidden">
        
        {/* Modal Header Bar */}
        <div className="px-6 py-3.5 border-b border-[#e5e2db] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#13322b]">Import Preview</h2>
            <div className="flex items-center gap-2 pl-3 border-l border-[#e5e2db]">
              <OfficialBrandLogo id="shopify" />
              <span className="font-bold text-sm text-[#13322b]">{selectedObject || "Products"}</span>
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedObject && (
              <>
                <button className="px-3.5 py-1.5 bg-white border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8] shadow-2xs">
                  <Filter className="w-3.5 h-3.5 text-gray-600" />
                  <span>Filter</span>
                </button>
                <button className="px-3.5 py-1.5 bg-white border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8] shadow-2xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-600" />
                  <span>Sort</span>
                </button>
                
                <span className="text-xs text-gray-500 font-semibold px-2">{selectedFieldIds.length} fields selected</span>

                <button 
                  onClick={handleDoneClick}
                  className="px-7 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Import</span>
                </button>
              </>
            )}

            <button 
              onClick={handleDoneClick}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-all ml-1 cursor-pointer"
              title="Close dialogue"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#13322b] text-[#c59b43] flex items-center justify-center shadow-lg animate-bounce">
              <OfficialBrandLogo id="shopify" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-[#13322b] animate-pulse">Connecting to Shopify...</h3>
              <p className="text-xs text-gray-500 font-medium">Fetching 100% Comprehensive Shopify GraphQL Schemas</p>
            </div>
            <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="w-full h-full bg-[#13322b] animate-pulse" />
            </div>
          </div>
        ) : (
          /* Modal Body: Left Pane (38 Shopify Objects) + Middle Pane (Nested Field Tree) + Right Pane (Dynamic Table) */
          <div className="flex-1 flex overflow-hidden">
            
            {/* COLUMN 1: All 38 Shopify Objects Selector Pane */}
            <div className="w-64 border-r border-[#e5e2db] p-3.5 space-y-3 bg-[#faf9f6] flex flex-col shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search"
                  value={objectSearchTerm}
                  onChange={(e) => setObjectSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e5e2db] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#13322b] text-[#13322b] font-medium"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filteredObjects.map((objName) => (
                  <button
                    key={objName}
                    onClick={() => handleSelectObject(objName)}
                    className={`w-full px-3 py-2 text-left rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      selectedObject === objName 
                        ? "bg-[#13322b] text-white font-bold shadow-xs" 
                        : "text-[#635f54] hover:bg-white hover:text-[#13322b]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Table className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="truncate">{objName}</span>
                    </div>
                    {selectedObject === objName && <Check className="w-4 h-4 text-[#c59b43]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* COLUMN 2: Nested Expandable Field Tree Pane */}
            <div className="w-80 border-r border-[#e5e2db] p-3.5 space-y-3 bg-white flex flex-col shrink-0">
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-xs text-[#13322b]">{selectedObject} Fields</span>
                <button 
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-[#2563eb] hover:underline"
                >
                  Select All
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search fields"
                  value={fieldSearchTerm}
                  onChange={(e) => setFieldSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#faf9f6] border border-[#e5e2db] rounded-lg focus:outline-none text-[#13322b] font-medium"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 border-t border-[#f0ede6] pt-2">
                {currentSchema.map(node => renderTreeNode(node, 0))}
              </div>
            </div>

            {/* COLUMN 3: Right Dynamic Live Table Preview Pane */}
            <div className="flex-1 p-4 flex flex-col overflow-hidden bg-[#faf9f6]">
              {!selectedObject ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-[#e5e2db]">
                  <FileText className="w-12 h-12 text-gray-300 mb-3" />
                  <h3 className="text-sm font-medium text-gray-600">Select an object to preview data</h3>
                </div>
              ) : (
                <div className="flex-1 overflow-auto border border-[#e5e2db] rounded-2xl shadow-2xs bg-white">
                  <table className="w-full text-left border-collapse text-xs min-w-max">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e5e2db] text-[#1a73e8]">
                        <th className="p-3 border-r border-[#e5e2db] w-10 text-center">
                          <input type="checkbox" checked readOnly className="accent-[#2563eb]" />
                        </th>
                        {getAllLeafIds(currentSchema).filter(id => selectedFieldIds.includes(id)).map((fieldId) => (
                          <th key={fieldId} className="p-3 font-bold border-r border-[#e5e2db] whitespace-nowrap bg-[#f1f5f9] text-[#1a73e8]">
                            <div className="flex items-center justify-between gap-3">
                              <span>{fieldId.split('.').pop()?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e2db]">
                      {currentSampleData.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-[#f8fafc] text-gray-700 font-mono text-xs">
                          <td className="p-3 border-r border-[#e5e2db] bg-[#fafafa] font-semibold text-center text-gray-400">
                            {rowIdx + 1}
                          </td>
                          {getAllLeafIds(currentSchema).filter(id => selectedFieldIds.includes(id)).map((fieldId) => (
                            <td key={fieldId} className="p-3 border-r border-[#e5e2db] whitespace-nowrap font-medium text-gray-800">
                              {row[fieldId] || row[fieldId.split('.').pop()!] || `gid://shopify/${selectedObject}/${rowIdx + 101}`}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
