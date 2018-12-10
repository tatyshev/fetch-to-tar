export default class Ram {
  private blobs: Blob[] = [];

  async addBlob(blob: Blob) {
    this.blobs.push(blob);
  }

  async getBlobs() {
    return this.blobs;
  }

  async teardown() {
    // Nothing
  }
}
