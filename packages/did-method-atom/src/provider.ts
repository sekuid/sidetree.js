import AzureSqlDbLedger from '@sidetree/ms-sqldb';
import { AzureStorageCas } from '@sidetree/cas-azure-storage';
import Atom from './Atom';
export type AtomNodeConfigs = {
  msSqlDbLedgerConnectionString: string;
  msSqlDbLedgerTable: string;
  storageContainerName: string;
  storageConnectionString: string;
  didMethodName: string;
  databaseName: string;
  mongoDbConnectionString: string;
  batchingIntervalInSeconds: number;
  observingIntervalInSeconds: number;
  maxConcurrentDownloads: number;
  versions: {
    startingBlockchainTime: number;
    version: string;
  }[];
};

const getLedger = async (config: AtomNodeConfigs) => {
  const ledger = new AzureSqlDbLedger(
    config.msSqlDbLedgerTable,
    config.msSqlDbLedgerConnectionString
  );

  await ledger.initialize();
  return ledger;
};

const getCas = async (config: AtomNodeConfigs) => {
  const cas = new AzureStorageCas(
    config.storageConnectionString,
    config.storageContainerName
  );

  await cas.initialize();
  return cas;
};

export const getNodeInstance = async (
  config: AtomNodeConfigs
): Promise<Atom> => {
  const ledger = await getLedger(config);
  const cas = await getCas(config);
  const atom = new Atom(config as any, config.versions, cas, ledger);
  await atom.initialize();
  return atom;
};
