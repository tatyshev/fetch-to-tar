export default class Ram {
  cursor: number = -1;
  private blobs: Blob[] = [];

  async addBlob(blob: Blob) {
    this.cursor += 1;
    this.blobs.push(blob);
  }

  async putBlob(key: any, blob: Blob) {
    this.blobs[key] = blob;
  }

  async getBlobs() {
    return this.blobs;
  }

  async teardown() {
    this.blobs = [];
  }
}
