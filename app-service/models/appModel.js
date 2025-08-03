class App {
    constructor(id, name, size, contentType, data) {
        this.id = id;
        this.name = name;
        this.size = size;
        this.contentType = contentType;
        this.data = data;
    }

    // Method to return the app data in a structured format
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            size: this.size,
            contentType: this.contentType,
            data: this.data // You can store a URL or base64 data here
        };
    }
}

module.exports = App;
