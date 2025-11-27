const TENANT_NAME = "globalise";
const TENANT_DOMAIN = "localhost";

const mainDb = db.getSiblingDB("main");

mainDb.tenants.createIndex({ domain: 1 }, { unique: true });

mainDb.tenants.updateOne(
    { name: TENANT_NAME },
    { $set: { name: TENANT_NAME, domain: TENANT_DOMAIN } },
    { upsert: true }
);
