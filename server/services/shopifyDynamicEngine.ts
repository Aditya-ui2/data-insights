// Pure Dynamic Runtime JSON Inspection Engine - Zero Predefined Interfaces or Field Whitelists
// Treats Shopify API responses as raw dynamic JSON, recursively inspects every key at runtime,
// flattens nested objects/arrays, and builds dynamic schemas and Google Sheets column bindings.

export interface RuntimeDynamicSchema {
  schemaTree: any[];
  allKeys: string[];
  flatRows: Record<string, string>[];
}

export function inspectRuntimeDynamicJson(rawJsonRecords: any[]): RuntimeDynamicSchema {
  const unionKeys = new Set<string>();
  const flatRows: Record<string, string>[] = [];

  // Recursive Flattener Function (No Whitelists, Pure Dynamic Object Inspection)
  const flatten = (data: any, path = ""): Record<string, any> => {
    const output: Record<string, any> = {};
    if (data === null || data === undefined) return output;

    if (typeof data === "object" && !Array.isArray(data) && !(data instanceof Date)) {
      for (const k of Object.keys(data)) {
        const fullPath = path ? `${path}.${k}` : k;
        Object.assign(output, flatten(data[k], fullPath));
      }
    } else if (Array.isArray(data)) {
      if (data.length === 0) {
        output[path] = "";
      } else {
        data.forEach((item, index) => {
          const arrayPath = `${path}.${index}`;
          if (typeof item === "object" && item !== null) {
            Object.assign(output, flatten(item, arrayPath));
          } else {
            output[arrayPath] = item;
          }
        });
      }
    } else {
      output[path] = data;
    }
    return output;
  };

  // Inspect every record in rawJsonRecords dynamically
  for (const record of rawJsonRecords) {
    const flatRecord = flatten(record);
    flatRows.push(flatRecord);
    for (const key of Object.keys(flatRecord)) {
      unionKeys.add(key);
    }
  }

  const sortedKeys = Array.from(unionKeys).sort();

  // Dynamically Build Schema Tree at Runtime (Zero Hardcoded Maps)
  const treeMap = new Map<string, any>();

  for (const keyPath of sortedKeys) {
    const segments = keyPath.split(".");
    let currentPath = "";

    segments.forEach((segment, idx) => {
      currentPath = currentPath ? `${currentPath}.${segment}` : segment;
      const isLeaf = idx === segments.length - 1;
      const label = segment.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

      if (!treeMap.has(currentPath)) {
        treeMap.set(currentPath, {
          id: currentPath,
          label: isLeaf ? label : segment.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase()),
          isGroup: !isLeaf,
          children: !isLeaf ? [] : undefined
        });
      }
    });
  }

  // Construct Tree Hierarchy
  const schemaTree: any[] = [];
  const nodeLookup = new Map<string, any>();

  treeMap.forEach((node, path) => {
    nodeLookup.set(path, { ...node, children: node.isGroup ? [] : undefined });
  });

  nodeLookup.forEach((node, path) => {
    const parts = path.split(".");
    if (parts.length === 1) {
      schemaTree.push(node);
    } else {
      const parentPath = parts.slice(0, parts.length - 1).join(".");
      const parentNode = nodeLookup.get(parentPath);
      if (parentNode && parentNode.children) {
        parentNode.children.push(node);
      } else {
        schemaTree.push(node);
      }
    }
  });

  return {
    schemaTree,
    allKeys: sortedKeys,
    flatRows
  };
}
