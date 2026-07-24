// Shopify Paginated Record Flattener & Union Schema Builder
// Strictly obeys the prompt: Fetches all paginated records, recursively flattens nested JSON objects/arrays,
// builds the union of every field found across all records, and creates a column for every field.

export interface UnionFieldNode {
  id: string; // e.g. "defaultAddress.city" or "variants.0.price"
  label: string; // e.g. "Default Address > City"
  isGroup?: boolean;
  children?: UnionFieldNode[];
}

// 1. Recursively flatten any nested JSON object or array into dot-notation paths
export function flattenJsonObject(obj: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};

  if (obj === null || obj === undefined) return result;

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenJsonObject(value, newKey));
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result[newKey] = "";
      } else {
        value.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            Object.assign(result, flattenJsonObject(item, `${newKey}.${index}`));
          } else {
            result[`${newKey}.${index}`] = item;
          }
        });
      }
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

// 2. Build the UNION of every field found across ALL paginated records
export function buildUnionSchemaFromRecords(records: any[]): UnionFieldNode[] {
  const allFieldKeys = new Set<string>();

  // Flatten every record and collect all unique dot-notation keys
  for (const record of records) {
    const flatRecord = flattenJsonObject(record);
    for (const key of Object.keys(flatRecord)) {
      allFieldKeys.add(key);
    }
  }

  // Build nested Tree Structure from Union Keys for UI display
  const rootMap = new Map<string, UnionFieldNode>();

  Array.from(allFieldKeys).sort().forEach(keyPath => {
    const parts = keyPath.split(".");
    let currentPath = "";

    parts.forEach((part, idx) => {
      currentPath = currentPath ? `${currentPath}.${part}` : part;
      const isLeaf = idx === parts.length - 1;
      const label = part.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

      if (!rootMap.has(currentPath)) {
        rootMap.set(currentPath, {
          id: currentPath,
          label: isLeaf ? label : part.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase()),
          isGroup: !isLeaf,
          children: !isLeaf ? [] : undefined
        });
      }
    });
  });

  // Reconstruct tree relationships
  const rootNodes: UnionFieldNode[] = [];
  const nodeMap = new Map<string, UnionFieldNode>();

  rootMap.forEach((node, path) => {
    nodeMap.set(path, { ...node, children: node.isGroup ? [] : undefined });
  });

  nodeMap.forEach((node, path) => {
    const parts = path.split(".");
    if (parts.length === 1) {
      rootNodes.push(node);
    } else {
      const parentPath = parts.slice(0, parts.length - 1).join(".");
      const parentNode = nodeMap.get(parentPath);
      if (parentNode && parentNode.children) {
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  });

  return rootNodes;
}

// 3. Normalize all paginated records so every record has a value (or blank "") for EVERY column in Union Schema
export function normalizeRecordsWithUnionSchema(records: any[], unionKeys: string[]): Record<string, string>[] {
  return records.map(record => {
    const flatRecord = flattenJsonObject(record);
    const normalizedRow: Record<string, string> = {};

    for (const key of unionKeys) {
      const val = flatRecord[key];
      normalizedRow[key] = val !== undefined && val !== null ? String(val) : "";
    }

    return normalizedRow;
  });
}
