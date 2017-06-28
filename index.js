// use a mock DOM so we can run mithril on the server
require('mithril/test-utils/browserMock')(global);

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { transform } = require("babel-core");
const mithril = require('mithril');
const render = require('mithril-node-render');

function BabelTransform(source) {
  return transform(source, { "plugins": [["transform-react-jsx", { "pragma": "h" }]] });
};

function BootstrapSource(source) {
  return "(function(h, sx) { return async function(it) {  \n return " + source + ";\n }; })";
}

module.exports = class Templater {
  constructor(viewsPath, debug) {
    assert(viewsPath, "The Views path is obligatory!");
    this.viewsPath = viewsPath;
    this.templates = [];
    this.debug = debug || false;
  }

  async compile(templateName) {
    try {
      let templatePath = path.join(this.viewsPath, templateName + '.jsx');

      if (!fs.existsSync(templatePath)) throw new Error('File does not exist');

      let file = fs.readFileSync(templatePath).toString();

      file = BootstrapSource(file);

      let compiled = BabelTransform(file).code;

      this.templates[templateName] = eval(compiled)(mithril, this);

    } catch (e) {
      throw new Error('Error compiling template "' + templateName + '"\nError: ' + e.message);
    }
  }

  async render(templateName, model) {
    return await render(await this.executeTemplate(templateName, model));
  }

  async extends(templateBaseName, props) {
    return await this.executeTemplate(templateBaseName, props);
  }

  async executeTemplate(templateName, model) {
    return await (await this.getTemplate(templateName))(model);
  }

  async getTemplate(templateName) {

    if (!this.templates[templateName] || this.debug)
      await this.compile(templateName);

    return this.templates[templateName];
  }
}