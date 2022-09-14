import { getNodeInstance } from '..';
import config from './atom-config.json';
const { MongoClient } = require('mongodb');

let client: any;

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const clearCollection = async (collectionName: string) => {
  client = await MongoClient.connect(config.mongoDbConnectionString, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  } as any);
  const db = await client.db(config.databaseName);
  const collection = db.collection(collectionName);
  await collection.deleteMany({});
  await client.close();
};

export const getTestAtom = async (): Promise<any> => {
  const atom = await getNodeInstance(config);
  return atom;
};

export const replaceMethod = (
  result: JSON,
  defaultMethod = 'did:elem',
  specificMethod = 'did:atom'
): JSON => {
  const stringified = JSON.stringify(result);
  const updatedStringified = stringified.replace(
    new RegExp(defaultMethod, 'g'),
    specificMethod
  );
  const updateResult = JSON.parse(updatedStringified);
  return updateResult;
};
