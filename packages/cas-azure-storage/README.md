# @sidetree/cas-azure-storage

This package contains an implementation of [Content Addressable Storage](https://en.wikipedia.org/wiki/Content-addressable_storage) used in Sidetree.

It contains:

- `AzureStorageCas`: A CAS interface for Azure Storage


## Usage

```
npm install --save @sidetree/cas-azure-storage
```

## Development

```
git clone https://github.com/transmute-industries/sidetree.js.git && cd sidetree.js
npm install
```

## Testing for this Module

```
cd packages/cas-azure-storage
npm run test
```

By default the test for this package will use a the azurite emulator
implementation to replicate the functionality of Azure Storage.

## Container Name

The default container name is `sidetree-cas-azure-storage-test`. The value for this can be changed
in `src/tests/cas-config.json`.

```
{
  "containerName": "sidetree-cas-s3-test",
  "connectionString": "AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;",
}
```
