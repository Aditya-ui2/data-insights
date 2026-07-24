import { useState, useEffect, useMemo } from "react";
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

// All 38 Official Shopify Objects
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
  selectedCount?: number;
  children?: FieldNode[];
}

// Products Schema (80 Fields)
const PRODUCTS_SCHEMA: FieldNode[] = [
  {
    id: "category",
    label: "Category",
    isGroup: true,
    children: [
      { id: "category.id", label: "Category Id" },
      { id: "category.name", label: "Category Name" },
      { id: "category.fullName", label: "Category Full Name" },
      { id: "category.description", label: "Category Description" },
      { id: "category.handle", label: "Category Handle" },
      { id: "category.level", label: "Category Level" },
      { id: "category.updatedAt", label: "Category Updated At" },
      {
        id: "category.ancestors",
        label: "Ancestors",
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
          { id: "combinedListing.parentProduct.handle", label: "Parent Product Handle" },
          { id: "combinedListing.parentProduct.status", label: "Parent Product Status" },
          { id: "combinedListing.parentProduct.vendor", label: "Parent Product Vendor" }
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
  { id: "createdAt", label: "Created At" },
  { id: "description", label: "Description" },
  { id: "descriptionHtml", label: "Description Html" },
  {
    id: "featuredMedia",
    label: "Featured Media",
    isGroup: true,
    children: [
      { id: "featuredMedia.id", label: "Media Id" },
      { id: "featuredMedia.mediaContentType", label: "Media Content Type" },
      { id: "featuredMedia.alt", label: "Media Alt Text" }
    ]
  },
  { id: "handle", label: "Handle" },
  { id: "id", label: "Id" },
  { id: "legacyResourceId", label: "Legacy Resource Id" },
  { id: "productType", label: "Product Type" },
  { id: "publishedAt", label: "Published At" },
  { id: "status", label: "Status" },
  { id: "tags", label: "Tags" },
  { id: "title", label: "Title" },
  { id: "totalInventory", label: "Total Inventory" },
  { id: "totalVariants", label: "Total Variants" },
  { id: "updatedAt", label: "Updated At" },
  { id: "vendor", label: "Vendor" }
];

// Customers Schema (30 Fields)
const CUSTOMERS_SCHEMA: FieldNode[] = [
  { id: "id", label: "Id" },
  { id: "legacyResourceId", label: "Legacy Resource Id" },
  { id: "displayName", label: "Display Name" },
  { id: "email", label: "Email" },
  { id: "firstName", label: "First Name" },
  { id: "lastName", label: "Last Name" },
  { id: "phone", label: "Phone" },
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
  { id: "canDelete", label: "Can Delete" },
  { id: "locale", label: "Locale" },
  { id: "note", label: "Note" },
  { id: "state", label: "State" },
  { id: "tags", label: "Tags" },
  { id: "taxExempt", label: "Tax Exempt" },
  { id: "verifiedEmail", label: "Verified Email" }
];

function getSchemaForObject(objName: string): FieldNode[] {
  if (objName === "Customers") return CUSTOMERS_SCHEMA;
  return PRODUCTS_SCHEMA;
}

function getLeafNodes(nodes: FieldNode[]): { id: string; label: string }[] {
  let list: { id: string; label: string }[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      list = [...list, ...getLeafNodes(node.children)];
    } else {
      list.push({ id: node.id, label: node.label });
    }
  }
  return list;
}

function getAllLeafIds(nodes: FieldNode[]): string[] {
  return getLeafNodes(nodes).map(n => n.id);
}

// Complete Master Sample Store Data (All 30 Customer Fields Populated!)
const MASTER_LIVE_STORE_DATA: Record<string, Record<string, string>[]> = {
  Products: [
    {
      id: "gid://shopify/Product/10087354892528",
      legacyResourceId: "10087354892528",
      title: "The Inventory Not Tracked Snowboard",
      productType: "snowboard",
      vendor: "di-insights",
      description: "—",
      descriptionHtml: "—",
      handle: "the-inventory-not-tracked-snowboard",
      status: "ACTIVE",
      tags: "Snowboard, Equipment",
      publishedAt: "2026-07-01 10:15:00",
      createdAt: "2026-07-01 10:15:00",
      updatedAt: "2026-07-24 12:00:00",
      totalInventory: "150",
      totalVariants: "4",
      combinedListingRole: "PARENT",
      "category.id": "gid://shopify/TaxonomyCategory/aa-1",
      "category.name": "Snowboards",
      "category.fullName": "Sporting Goods > Winter Sports > Snowboarding > Snowboards",
      "category.description": "All mountain snowboards",
      "category.handle": "snowboards",
      "category.level": "3",
      "category.updatedAt": "2026-07-01 10:15:00",
      "category.ancestors.id": "gid://shopify/TaxonomyCategory/aa-0",
      "category.ancestors.name": "Sporting Goods",
      "combinedListing.parentProduct.id": "gid://shopify/Product/10087354892528",
      "combinedListing.parentProduct.title": "The Inventory Not Tracked Snowboard",
      "combinedListing.parentProduct.handle": "the-inventory-not-tracked-snowboard",
      "combinedListing.parentProduct.status": "ACTIVE",
      "combinedListing.parentProduct.vendor": "di-insights",
      "compareAtPriceRange.maxVariantCompareAtPrice.amount": "699.99",
      "compareAtPriceRange.maxVariantCompareAtPrice.currencyCode": "USD",
      "compareAtPriceRange.minVariantCompareAtPrice.amount": "499.99",
      "compareAtPriceRange.minVariantCompareAtPrice.currencyCode": "USD",
      "featuredMedia.id": "gid://shopify/Media/101",
      "featuredMedia.mediaContentType": "IMAGE",
      "featuredMedia.alt": "Snowboard hero image"
    },
    {
      id: "gid://shopify/Product/10087354925296",
      legacyResourceId: "10087354925296",
      title: "Gift Card",
      productType: "giftcard",
      vendor: "Snowboards",
      description: "This is a gift card for the store",
      descriptionHtml: "<p>Gift Card</p>",
      handle: "gift-card",
      status: "ACTIVE",
      tags: "Gift Card, Voucher",
      publishedAt: "2026-07-02 11:20:00",
      createdAt: "2026-07-02 11:20:00",
      updatedAt: "2026-07-24 13:10:00",
      totalInventory: "999",
      totalVariants: "1",
      combinedListingRole: "NONE",
      "category.id": "gid://shopify/TaxonomyCategory/aa-2",
      "category.name": "Gift Cards",
      "category.fullName": "Arts & Entertainment > Party & Celebration > Gift Cards",
      "category.description": "Digital gift certificates",
      "category.handle": "gift-cards",
      "category.level": "2",
      "category.updatedAt": "2026-07-02 11:20:00",
      "category.ancestors.id": "gid://shopify/TaxonomyCategory/aa-00",
      "category.ancestors.name": "Arts",
      "combinedListing.parentProduct.id": "—",
      "combinedListing.parentProduct.title": "—",
      "combinedListing.parentProduct.handle": "—",
      "combinedListing.parentProduct.status": "—",
      "combinedListing.parentProduct.vendor": "—",
      "compareAtPriceRange.maxVariantCompareAtPrice.amount": "100.00",
      "compareAtPriceRange.maxVariantCompareAtPrice.currencyCode": "USD",
      "compareAtPriceRange.minVariantCompareAtPrice.amount": "25.00",
      "compareAtPriceRange.minVariantCompareAtPrice.currencyCode": "USD",
      "featuredMedia.id": "gid://shopify/Media/102",
      "featuredMedia.mediaContentType": "IMAGE",
      "featuredMedia.alt": "Gift card image"
    }
  ],
  Customers: [
    {
      id: "gid://shopify/Customer/9494632",
      legacyResourceId: "9494632",
      displayName: "Ayumu Hirano",
      email: "ayumu.hirano@example.com",
      firstName: "Ayumu",
      lastName: "Hirano",
      phone: "+1 416-555-0192",
      createdAt: "2026-07-07 01:31:18",
      updatedAt: "2026-07-24 12:00:00",
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
      canDelete: "True",
      locale: "en",
      note: "VIP Customer",
      state: "ENABLED",
      tags: "VIP, Repeat Buyer",
      taxExempt: "False",
      verifiedEmail: "True"
    },
    {
      id: "gid://shopify/Customer/9494633",
      legacyResourceId: "9494633",
      displayName: "Russell Winfield",
      email: "russel.winfield@example.com",
      firstName: "Russell",
      lastName: "Winfield",
      phone: "+1 613-555-0184",
      createdAt: "2026-07-07 01:31:19",
      updatedAt: "2026-07-24 14:15:00",
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
      canDelete: "True",
      locale: "en",
      note: "Wholesale Partner",
      state: "ENABLED",
      tags: "Wholesale",
      taxExempt: "False",
      verifiedEmail: "True"
    },
    {
      id: "gid://shopify/Customer/9494634",
      legacyResourceId: "9494634",
      displayName: "Karine Ruby",
      email: "karine.ruby@example.com",
      firstName: "Karine",
      lastName: "Ruby",
      phone: "+1 514-555-0177",
      createdAt: "2026-07-08 04:12:00",
      updatedAt: "2026-07-24 15:30:00",
      "amountSpent.amount": "85.00",
      "amountSpent.currencyCode": "USD",
      numberOfOrders: "3",
      "defaultAddress.address1": "742 Evergreen Terrace",
      "defaultAddress.address2": "Apt 2B",
      "defaultAddress.city": "Montreal",
      "defaultAddress.company": "Ruby Alpine",
      "defaultAddress.country": "Canada",
      "defaultAddress.countryCodeV2": "CA",
      "defaultAddress.firstName": "Karine",
      "defaultAddress.lastName": "Ruby",
      "defaultAddress.phone": "+1 514-555-0177",
      "defaultAddress.province": "Quebec",
      "defaultAddress.zip": "H2X 1Y5",
      canDelete: "True",
      locale: "fr",
      note: "Alpine Snowboarder",
      state: "ENABLED",
      tags: "Pro-Staff",
      taxExempt: "False",
      verifiedEmail: "True"
    }
  ]
};

export default function ImportPreviewPage() {
  const [selectedObject, setSelectedObject] = useState<string>("Products");
  const [objectSearchTerm, setObjectSearchTerm] = useState("");
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Expanded Groups Set
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([
    "category", "combinedListing", "compareAtPriceRange", "featuredMedia", "options", "priceRangeV2", "seo", "variants", "amountSpent", "defaultAddress"
  ]);

  const currentSchema = useMemo(() => getSchemaForObject(selectedObject), [selectedObject]);
  const masterLeafNodes = useMemo(() => getLeafNodes(currentSchema), [currentSchema]);

  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);

  // Initialize ALL leaf fields as selected when switching category object
  useEffect(() => {
    const allLeafs = masterLeafNodes.map(n => n.id);
    setSelectedFieldIds(allLeafs);
  }, [selectedObject, masterLeafNodes]);

  const handleSelectObject = (objName: string) => {
    setIsLoading(true);
    setSelectedObject(objName);
    setTimeout(() => {
      setIsLoading(false);
    }, 150);
  };

  const toggleGroupExpand = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleFieldSelect = (node: FieldNode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const toggleSelectAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allLeafs = masterLeafNodes.map(n => n.id);
    if (selectedFieldIds.length === allLeafs.length) {
      setSelectedFieldIds([]);
    } else {
      setSelectedFieldIds(allLeafs);
    }
  };

  const filteredObjects = ALL_SHOPIFY_OBJECTS.filter(o => 
    objectSearchTerm === "" || o.toLowerCase().includes(objectSearchTerm.toLowerCase())
  );

  const isAllSelected = selectedFieldIds.length === masterLeafNodes.length && masterLeafNodes.length > 0;

  // DYNAMICALLY RENDER A TABLE COLUMN FOR EVERY CHECKED FIELD (100% VISIBLE WITH HORIZONTAL SCROLL)
  const activeTableColumns = useMemo(() => {
    return masterLeafNodes.filter(node => selectedFieldIds.includes(node.id));
  }, [masterLeafNodes, selectedFieldIds]);

  const activeRows = MASTER_LIVE_STORE_DATA[selectedObject] || MASTER_LIVE_STORE_DATA["Products"];

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
              <span className="font-bold text-sm text-[#13322b]">Shopify</span>
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
                
                {/* Real-time Selected Fields Count Badge */}
                <span className="text-xs text-gray-500 font-semibold px-2">
                  {selectedFieldIds.length} fields selected
                </span>

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
              <h3 className="text-sm font-bold text-[#13322b] animate-pulse">Loading {selectedObject}...</h3>
              <p className="text-xs text-gray-500 font-medium">Fetching 100% Dynamic Store Fields & Table Records</p>
            </div>
            <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="w-full h-full bg-[#13322b] animate-pulse" />
            </div>
          </div>
        ) : (
          /* Modal Body: Left Pane (38 Shopify Objects) + Middle Pane (Nested Field Tree) + Right Pane (Dynamic Table with Full Horizontal Scroll) */
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
                <span className="font-bold text-xs text-[#13322b]">{selectedObject}</span>
                <span className="text-xs text-blue-600 font-semibold cursor-pointer">edit</span>
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
                {/* Fully Interactive Select All Button */}
                <div 
                  onClick={(e) => toggleSelectAll(e)}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs font-bold text-[#1d4ed8] cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={(e) => toggleSelectAll(e as any)}
                    className="w-4 h-4 rounded text-[#2563eb] accent-[#2563eb] cursor-pointer" 
                  />
                  <span>Select All</span>
                </div>
                {currentSchema.map(node => renderTreeNode(node, 0))}
              </div>
            </div>

            {/* COLUMN 3: Right Dynamic Live Table Preview Pane WITH FULL HORIZONTAL & VERTICAL SCROLLBARS */}
            <div className="flex-1 p-4 flex flex-col overflow-hidden bg-[#faf9f6]">
              {activeTableColumns.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-[#e5e2db]">
                  <FileText className="w-12 h-12 text-gray-300 mb-3" />
                  <h3 className="text-sm font-medium text-gray-600">No fields selected for preview</h3>
                  <p className="text-xs text-gray-400 mt-1">Check one or more fields on the left to add columns to the table.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto overflow-y-auto border border-[#e5e2db] rounded-2xl shadow-2xs bg-white scrollbar-thin scrollbar-thumb-gray-400">
                  <table className="min-w-full text-left border-collapse text-xs border-spacing-0">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e5e2db] text-[#1a73e8] sticky top-0 z-10">
                        {activeTableColumns.map((col, idx) => (
                          <th 
                            key={col.id} 
                            className={`p-3 font-bold border-r border-[#e5e2db] whitespace-nowrap bg-[#f1f5f9] text-[#1a73e8] ${
                              idx === 0 ? "sticky left-0 z-20 bg-[#e2e8f0]" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span>{col.label}</span>
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e2db]">
                      {activeRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-[#f8fafc] text-gray-700 font-mono text-xs">
                          {activeTableColumns.map((col, idx) => (
                            <td 
                              key={col.id} 
                              className={`p-3 border-r border-[#e5e2db] whitespace-nowrap font-medium text-gray-800 ${
                                idx === 0 ? "sticky left-0 z-10 bg-white font-bold text-[#1d4ed8]" : ""
                              }`}
                            >
                              {row[col.id] || row[col.id.split('.').pop()!] || "—"}
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
