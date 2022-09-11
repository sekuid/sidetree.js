import casConfig from './cas-config.json';
import { testSuite } from '@sidetree/cas';
import AzureStorageCas from '../AzureStorageCas';

const cas = new AzureStorageCas(
  casConfig.connectionString,
  casConfig.containerName
);

testSuite(cas);
