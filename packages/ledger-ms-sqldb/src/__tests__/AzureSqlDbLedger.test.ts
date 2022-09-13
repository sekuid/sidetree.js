import { filesystem } from '@sidetree/test-vectors';
import AzureSqlDbLedger from '../AzureSqlDbLedger';
jest.setTimeout(10 * 1000);

import ledgerConfig from './ledger-config.json';

describe('AzureSqlDbLedger tests', () => {
  const ledger = new AzureSqlDbLedger(
    ledgerConfig.tableName,
    ledgerConfig.connectionString
  );

  const { anchorString, anchorString2, anchorString3 } = filesystem.anchorFile;
  let blockTime1: number;
  let blockTimeHash1: string;

  beforeAll(async () => {
    await ledger.reset();
    await ledger.initialize();
  });

  afterAll(async () => {
    await ledger.ledgerConnection.close();
  });

  it('gets service version', async () => {
    const serviceVersion = await ledger.getServiceVersion();
    expect(serviceVersion).toBeDefined();
    expect(['ms-sqldb'].includes(serviceVersion.name)).toBeTruthy();
    expect(serviceVersion.version).toBeDefined();
  });

  it('writes to the ledger', async () => {
    const realTime = await ledger.getLatestTime();
    const cachedTime = ledger.approximateTime;
    expect(realTime.time).toBeDefined();
    expect(realTime.hash).toBeDefined();
    expect(cachedTime.time).toBe(realTime.time);
    expect(cachedTime.hash).toBe(realTime.hash);
    const data = anchorString;
    await ledger.write(data);
    const realTime2 = await ledger.getLatestTime();
    const cachedTime2 = ledger.approximateTime;
    blockTime1 = realTime2.time;
    blockTimeHash1 = realTime2.hash;
    console.log(blockTime1);
    console.log(blockTimeHash1);
    expect(realTime2.time).toBeDefined();
    expect(realTime2.hash).toBeDefined();
    expect(cachedTime2.time).toBe(realTime2.time);
    expect(cachedTime2.hash).toBe(realTime2.hash);
  });

  it('reads from ledger', async () => {
    const { moreTransactions, transactions } = await ledger.read(
      -1,
      blockTimeHash1
    );
    expect(moreTransactions).toBeFalsy();
    expect(transactions).toHaveLength(1);
    const [transaction] = transactions;
    expect(transaction).toEqual({
      anchorString,
      normalizedTransactionFee: 0,
      transactionFeePaid: 0,
      transactionNumber: blockTime1,
      transactionTime: blockTime1,
      transactionTimeHash: blockTimeHash1,
      transactionTimestamp: transaction.transactionTimestamp,
      writer: 'writer',
    });
  });

  it('reads next transaction that got wrote', async () => {
    await ledger.write(anchorString2);
    const realTime = await ledger.getLatestTime();
    const { moreTransactions, transactions } = await ledger.read(
      blockTime1,
      realTime.hash
    );
    expect(moreTransactions).toBeFalsy();
    expect(transactions).toHaveLength(1);
    const [t1] = transactions;
    expect(t1).toEqual({
      anchorString: anchorString2,
      normalizedTransactionFee: 0,
      transactionFeePaid: 0,
      transactionNumber: realTime.time,
      transactionTime: realTime.time,
      transactionTimeHash: realTime.hash,
      transactionTimestamp: t1.transactionTimestamp,
      writer: 'writer',
    });
  });

  it('gets multiple transactions', async () => {
    await ledger.write(anchorString3);
    const { moreTransactions, transactions } = await ledger.read(
      Number(blockTime1) + 1,
      undefined
    );
    expect(moreTransactions).toBeFalsy();
    expect(transactions).toHaveLength(2);
  });

  it('should return no transaction if the requested transactionNumber has not been reached', async () => {
    const readResult = await ledger.read(
      Number.MAX_SAFE_INTEGER - 1,
      blockTimeHash1
    );
    expect(readResult.moreTransactions).toBeFalsy();
    expect(readResult.transactions).toHaveLength(0);
  });

  it('should return no transaction if the requested transactionTimeHash doesnt exist', async () => {
    const readResult = await ledger.read(-1, '0x123');
    expect(readResult.moreTransactions).toBeFalsy();
    expect(readResult.transactions).toHaveLength(0);
  });
});
