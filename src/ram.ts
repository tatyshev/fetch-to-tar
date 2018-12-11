export default class Ram {
  cursor: number = 0;
  private blobs: Blob[] = [];

  async addBlob(blob: Blob) {
    this.blobs.push(blob);
    this.cursor += 1;
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
