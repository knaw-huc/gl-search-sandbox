const DATA_TYPE_ELASTIC = "elasticsearch";
// const DATA_TYPE_CMDI = "cmdi";
const TENANT_DB = "globalise";
const DATASET_NAME = "search-sandbox";
const ES_INDEX = "globalise";
const DATA_TYPE = DATA_TYPE_ELASTIC;

// if DATA_TYPE === "elasticsearch":
const ID_PROPERTY_FOR_ELASTIC = "";      // empty per docs
const BASE_URL_FOR_ELASTIC = "";         // empty per docs

// if DATA_TYPE === "cmdi"
const ID_PROPERTY_FOR_CMDI = "id";       // property in ES holding CMDI editor ID
const BASE_URL_FOR_CMDI = "https://editor-domain-name.example.com/app/my-dataset/profile/clarin:p_12345/re";

const tenantDb = db.getSiblingDB(TENANT_DB);

tenantDb.datasets.createIndex({ tenant_name: 1, name: 1 }, { unique: true });
tenantDb.datasets.createIndex({ es_index: 1 });

const dataConfiguration =
    (DATA_TYPE === "cmdi")
        ? { id_property: ID_PROPERTY_FOR_CMDI, base_url: BASE_URL_FOR_CMDI }
        : { id_property: ID_PROPERTY_FOR_ELASTIC, base_url: BASE_URL_FOR_ELASTIC };

tenantDb.datasets.updateOne(
    { tenant_name: TENANT_DB, name: DATASET_NAME },
    {
        $set: {
            tenant_name: TENANT_DB,
            name: DATASET_NAME,
            es_index: ES_INDEX,
            data_type: DATA_TYPE,
            data_configuration: dataConfiguration,
            detail_id: "id"
        }
    },
    { upsert: true }
);
