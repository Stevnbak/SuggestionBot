const ExportManager = function () {
    this._exports = {};

    this.import = (prop) => this._exports[prop.toLowerCase()];

    this.export = (prop, val) => (this._exports[prop.toLowerCase()] = val);
};

module.exports = ExportManager;
