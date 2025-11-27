const TENANT_DB = "globalise";
const DATASET_NAME = "search-sandbox";

const tenantDb = db.getSiblingDB(TENANT_DB);

// ---------- FACETS ----------
tenantDb.facets.createIndex({ dataset_name: 1, name: 1 }, { unique: true });

// type oneOf { "text", "tree", "range" }
tenantDb.facets.deleteMany({ dataset_name: DATASET_NAME });
tenantDb.facets.insertMany([
   { dataset_name: DATASET_NAME, name: "Year from",   property: "years_from", type: "histogram", order: 0, interval: 5 },
    { dataset_name: DATASET_NAME, name: "Location",   property: "location.keyword", type: "tree", order: 1, tree_separator: '|' },
]);

// ---------- RESULT PROPERTIES ----------
tenantDb.result_properties.createIndex({ dataset_name: 1, order: 1 }, { unique: true });
tenantDb.result_properties.deleteMany({ dataset_name: DATASET_NAME });
tenantDb.result_properties.insertMany([
    { dataset_name: DATASET_NAME, name: "id",          path: "$._id",                type: 'number', order: 0 },
    { dataset_name: DATASET_NAME, name: "title",       path: "$.title",            type: 'text', order: 1 },
]);
