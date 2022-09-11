import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import {
  FetchResult,
  FetchResultCode,
  ICasService,
  ServiceVersionModel,
} from '@sidetree/common';
import Unixfs from 'ipfs-unixfs';
import { DAGNode } from 'ipld-dag-pb';
const { version } = require('../package.json');

export default class AzureStorageCas implements ICasService {
  private containerClient: ContainerClient;
  private blobServiceClient: BlobServiceClient;

  constructor(private connectionString: string, private containerName: string) {
    if (!this.containerName) {
      throw new Error('Please specify the container name');
    }

    if (!this.connectionString) {
      throw new Error('Please specify the connection string');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      connectionString
    );

    this.containerClient = this.blobServiceClient.getContainerClient(
      this.containerName
    );
  }

  public getServiceVersion: () => Promise<ServiceVersionModel> = () => {
    return Promise.resolve({
      name: 'cas-azure-storage',
      version,
    });
  };

  async initialize(): Promise<void> {
    try {
      const { containerClient } = await this.blobServiceClient.createContainer(
        this.containerName
      );
      this.containerClient = containerClient;
    } catch (err) {
      // if the container already exist do nothing
    }
  }

  async close(): Promise<void> {
    return;
  }

  public static async getAddress(content: Buffer): Promise<string> {
    const unixFs = new Unixfs('file', content);
    const marshaled = unixFs.marshal();
    const dagNode = new DAGNode(marshaled);
    const dagLink = await dagNode.toDAGLink({
      cidVersion: 0,
    });
    return dagLink.Hash.toString();
  }

  public async write(content: Buffer): Promise<string> {
    const encodedHash = await AzureStorageCas.getAddress(content);

    const blockBlobClient = this.containerClient.getBlockBlobClient(
      encodedHash
    );

    const writeResult = await blockBlobClient.upload(
      content,
      Buffer.byteLength(content)
    );

    const key = encodedHash;

    console.log(
      `${key} uploaded successfully. Request id ${writeResult.requestId}`
    );

    return key;
  }

  public async read(address: string): Promise<FetchResult> {
    try {
      const blockBlobClient = this.containerClient.getBlobClient(address);
      const content = await blockBlobClient.downloadToBuffer();

      return {
        code: FetchResultCode.Success,
        content,
      };
    } catch (err) {
      return {
        code: FetchResultCode.NotFound,
      };
    }
  }
}
