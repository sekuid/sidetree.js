/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BlockchainTimeModel,
  IBlockchain,
  ServiceVersionModel,
  TransactionModel,
  ValueTimeLockModel,
} from '@sidetree/common';
import { AnchoredDataSerializer } from '@sidetree/core';
import { connect, ConnectionPool } from 'mssql';
const { version } = require('../package.json');
import moment from 'moment';
import crypto from 'crypto';

interface TransactionRecord {
  CoreIndexFileUri: string;
  NumberOfOperations: number;
  TransactionTime: number;
  TransactionTimeHash: number;
  TransactionNumber: number;
  TransactionTimestamp: Date;
}

export interface TransactionModelMsSqlDb extends TransactionModel {
  transactionTimestamp: number; // unix timestamp
}

export default class AzureSqlDbLedger implements IBlockchain {
  public ledgerConnection: ConnectionPool;

  constructor(
    public transactionTable: string,
    private connectionString: string
  ) {
    this.ledgerConnection = new ConnectionPool(connectionString);
  }

  public getServiceVersion(): Promise<ServiceVersionModel> {
    return Promise.resolve({
      name: 'ms-sqldb',
      version,
    });
  }

  public async reset(): Promise<void> {
    console.log('resetting', this.transactionTable);

    // connect to db
    this.ledgerConnection = await connect(this.connectionString);

    // create db table if it doesn't already exist
    await this.ensureDbTableExists(this.transactionTable);

    // delete all data
    const deleteQuery = `DELETE ${this.transactionTable}`;

    // execute query
    await this.ledgerConnection.query(deleteQuery);
  }

  public async initialize(): Promise<void> {
    console.log('creating transaction table', this.transactionTable);

    // connect to db
    this.ledgerConnection = await connect(this.connectionString);

    // create db table if it doesn't already exist
    await this.ensureDbTableExists(this.transactionTable);
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

    const now = moment();
    const currentDate = now.format('DDHHmmssSSS');
    const transactionTime = parseInt(currentDate);
    const transactionTimeHash = crypto
      .createHash('SHA256')
      .update(now.toISOString())
      .digest('base64');

    const insertQuery = `INSERT INTO [${this.transactionTable}]
                            ([CoreIndexFileUri]
                            ,[NumberOfOperations]
                            ,[TransactionTime]
                            ,[TransactionTimeHash])
                         VALUES
                          ('${coreIndexFileUri}'
                            ,${numberOfOperations}
                            ,${transactionTime}
                            ,'${transactionTimeHash}')`;
    // console.log(insertQuery);
    // this.ledgerConnection = await connect(this.connectionString);
    const result = await this.ledgerConnection.query(insertQuery);
    console.log(`Writing to ledger result ${JSON.stringify(result.output)}`);
  }

  public async read(
    sinceTransactionNumber?: number,
    transactionTimeHash?: string
  ): Promise<{
    moreTransactions: boolean;
    transactions: TransactionModelMsSqlDb[];
  }> {
    console.log('Starting read transaction at: ', new Date());

    let sqlQuery;

    if (sinceTransactionNumber && transactionTimeHash) {
      sqlQuery = `SELECT TX.[CoreIndexFileUri]
                        ,TX.[NumberOfOperations]
                        ,TX.[TransactionTime]
                        ,TX.[TransactionTimeHash]
                        ,TX.[TransactionTime] TransactionNumber
                        ,LTX.[commit_time] TransactionTimestamp
                  FROM [RegistryDB].[dbo].[Transactions] TX
                  INNER JOIN sys.database_ledger_transactions LTX ON TX.[ledger_start_transaction_id] = LTX.transaction_id
                  WHERE TX.[TransactionTimeHash] = '${transactionTimeHash}' AND
                  TX.[TransactionTime] >= ${sinceTransactionNumber}
                  ORDER BY LTX.[commit_time] DESC`;
    } else if (sinceTransactionNumber) {
      sqlQuery = `SELECT TX.[CoreIndexFileUri]
                        ,TX.[NumberOfOperations]
                        ,TX.[TransactionTime]
                        ,TX.[TransactionTimeHash]
                        ,TX.[TransactionTime] TransactionNumber
                        ,LTX.[commit_time] TransactionTimestamp
                  FROM [RegistryDB].[dbo].[Transactions] TX
                  INNER JOIN sys.database_ledger_transactions LTX ON TX.[ledger_start_transaction_id] = LTX.transaction_id
                  WHERE TX.[TransactionTime] >= ${sinceTransactionNumber}
                  ORDER BY LTX.[commit_time] DESC`;
    } else if (transactionTimeHash) {
      sqlQuery = `SELECT TX.[CoreIndexFileUri]
                        ,TX.[NumberOfOperations]
                        ,TX.[TransactionTime]
                        ,TX.[TransactionTimeHash]
                        ,TX.[TransactionTime] TransactionNumber
                        ,LTX.[commit_time] TransactionTimestamp
                  FROM [RegistryDB].[dbo].[Transactions] TX
                  INNER JOIN sys.database_ledger_transactions LTX ON TX.[ledger_start_transaction_id] = LTX.transaction_id
                  WHERE TX.[TransactionTimeHash] = '${transactionTimeHash}' 
                  ORDER BY LTX.[commit_time] DESC`;
    } else {
      sqlQuery = `SELECT TX.[CoreIndexFileUri]
                        ,TX.[NumberOfOperations]
                        ,TX.[TransactionTime]
                        ,TX.[TransactionTimeHash]
                        ,TX.[TransactionTime] TransactionNumber
                        ,LTX.[commit_time] TransactionTimestamp
                  FROM [RegistryDB].[dbo].[Transactions] TX
                  INNER JOIN sys.database_ledger_transactions LTX ON TX.[ledger_start_transaction_id] = LTX.transaction_id
                  ORDER BY LTX.[commit_time] DESC`;
    }
    console.debug(sqlQuery);
    const result = await this.ledgerConnection.query(sqlQuery);
    const transactions: TransactionModelMsSqlDb[] = ((result.recordset as unknown) as TransactionRecord[]).map(
      this.toSidetreeTransaction
    ) as TransactionModelMsSqlDb[];

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
    const query = `SELECT TOP 1
                       TX.[TransactionTime] time
                      ,TX.[TransactionTimeHash] hash
                   FROM [RegistryDB].[dbo].[Transactions] TX
                   INNER JOIN sys.database_ledger_transactions LTX ON TX.[ledger_start_transaction_id] = LTX.transaction_id
                   ORDER BY LTX.[commit_time] DESC`;
    const result = await this.ledgerConnection.query(query);

    if (result.recordset.length > 0) {
      this.approximateTime = (result
        .recordset[0] as unknown) as BlockchainTimeModel;
    }

    return this.approximateTime;
  }

  async getFee(_transactionTime: number): Promise<number> {
    return Promise.resolve(0);
  }

  async getValueTimeLock(
    _lockIdentifier: string
  ): Promise<ValueTimeLockModel | undefined> {
    return Promise.resolve(undefined);
  }

  async getWriterValueTimeLock(): Promise<ValueTimeLockModel | undefined> {
    return Promise.resolve(undefined);
  }

  private async ensureDbTableExists(dbTable: string): Promise<void> {
    console.log(`Ensure generate the ${dbTable} table`);
    const createQuery = `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='${dbTable}' and xtype='U')
                            CREATE TABLE [${dbTable}] (
                            	[CoreIndexFileUri] VARCHAR(50) NOT NULL PRIMARY KEY,
                              [NumberOfOperations] INT NOT NULL,
                              [TransactionTime] BIGINT NOT NULL,
                              [TransactionTimeHash] VARCHAR(50) NOT NULL
                            )
                            WITH (SYSTEM_VERSIONING = ON, LEDGER = ON);`;

    console.debug(createQuery);
    await this.ledgerConnection.query(createQuery);
  }

  private toSidetreeTransaction(txResult: TransactionRecord): TransactionModel {
    const transactionTimeHash = txResult.TransactionTimeHash;
    const transactionTime = txResult.TransactionTime;
    const transactionNumber = txResult.TransactionNumber;
    const transactionTimestamp = txResult.TransactionTimestamp.getTime();

    const anchorString = AnchoredDataSerializer.serialize({
      coreIndexFileUri: txResult.CoreIndexFileUri,
      numberOfOperations: txResult.NumberOfOperations,
    });
    return {
      transactionTime,
      transactionNumber,
      transactionTimeHash,
      transactionTimestamp,
      anchorString,
      transactionFeePaid: 0,
      normalizedTransactionFee: 0,
      writer: 'writer',
    } as any;
  }
}
