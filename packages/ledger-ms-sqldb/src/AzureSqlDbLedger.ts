/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BlockchainTimeModel,
  IBlockchain,
  ServiceVersionModel,
  TransactionModel,
  ValueTimeLockModel,
} from '@sidetree/common';
import { AnchoredDataSerializer } from '@sidetree/core';

const { version } = require('../package.json');

export interface TransactionModelMsSqlDb extends TransactionModel {
  transactionTimestamp: number; // unix timestamp
}

export default class AzureSqlDbLedger implements IBlockchain {
  public transactionTable: string;

  constructor(tableName: string) {
    this.transactionTable = tableName;
  }

  public getServiceVersion(): Promise<ServiceVersionModel> {
    return Promise.resolve({
      name: 'ms-sqldb',
      version,
    });
  }

  public async reset(): Promise<void> {
    console.log('resetting', this.transactionTable);
    // await this.executeWithRetry(`DELETE FROM ${this.transactionTable}`);
  }

  public async initialize(): Promise<void> {
    console.log('creating transaction table', this.transactionTable);
    //await this.executeWithoutError(`CREATE TABLE ${this.transactionTable}`);
  }

  public async getFirstValidTransaction(
    _transactions: TransactionModel[]
  ): Promise<TransactionModel | undefined> {
    return Promise.resolve(undefined);
  }

  public async write(anchorString: string): Promise<void> {
    const {
      coreIndexFileUri,
      numberOfOperations,
    } = AnchoredDataSerializer.deserialize(anchorString);
    console.log(`${coreIndexFileUri} ${numberOfOperations}`);
    //const now = new Date();
  }

  public async read(
    sinceTransactionNumber?: number,
    transactionTimeHash?: string
  ): Promise<{
    moreTransactions: boolean;
    transactions: TransactionModelMsSqlDb[];
  }> {
    console.log('Starting read transcation at: ', new Date());
    const transactions: TransactionModelMsSqlDb[] = [];
    console.log(`${sinceTransactionNumber} ${transactionTimeHash}`)
    return {
      moreTransactions: false,
      transactions,
    };
  }

  public approximateTime: BlockchainTimeModel = {
    time: 0,
    hash: '',
  };

  public async getLatestTime(): Promise<BlockchainTimeModel> {
    // MS SQL Server with ledger on is a centralized block chain so it wouldn't
    // ever been re-orged. Returning time value so reorg flag inside Observer.ts is always
    // false.
    return { time: 0, hash: '' };
  }

  getFee(_transactionTime: number): Promise<number> {
    return Promise.resolve(0);
  }

  getValueTimeLock(
    _lockIdentifier: string
  ): Promise<ValueTimeLockModel | undefined> {
    return Promise.resolve(undefined);
  }

  getWriterValueTimeLock(): Promise<ValueTimeLockModel | undefined> {
    return Promise.resolve(undefined);
  }
}
