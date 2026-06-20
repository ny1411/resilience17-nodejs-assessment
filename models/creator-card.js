const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator-cards';

/**
 * @typedef {Object} ModelSchema
 * @property {String} _id
 * @property {String} title
 * @property {String} description
 * @property {String} slug
 * @property {String} creator_reference
 * @property {Array} links
 * @property {Object} service_rates
 * @property {String} status
 * @property {String} access_type
 * @property {String} access_code
 * @property {Number} created
 * @property {Number} updated
 * @property {Number|null} deleted
 */

const linkSchema = new ModelSchema(
  {
    title: { type: SchemaTypes.String, required: true, minlength: 1, maxlength: 100 },
    url: { type: SchemaTypes.String, required: true, maxlength: 200 },
  },
  { _id: false }
);

const serviceRateSchema = new ModelSchema(
  {
    name: { type: SchemaTypes.String, required: true, minlength: 3, maxlength: 100 },
    description: { type: SchemaTypes.String, maxlength: 250 },
    amount: { type: SchemaTypes.Number, required: true, min: 1 },
  },
  { _id: false }
);

const serviceRatesConfig = new ModelSchema(
  {
    currency: { type: SchemaTypes.String, enum: ['NGN', 'USD', 'GBP', 'GHS'], required: true },
    rates: { type: [serviceRateSchema.createDBSchema()], required: true },
  },
  { _id: false }
);

const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: { type: SchemaTypes.String, required: true, minlength: 3, maxlength: 100 },
  description: { type: SchemaTypes.String, maxlength: 500 },
  slug: { type: SchemaTypes.String, unique: true, sparse: true, minlength: 5, maxlength: 50 },
  creator_reference: { type: SchemaTypes.String, required: true, minlength: 20, maxlength: 20 },
  links: { type: [linkSchema.createDBSchema()], default: [] },
  service_rates: { type: serviceRatesConfig.createDBSchema() },
  status: { type: SchemaTypes.String, enum: ['draft', 'published'], required: true },
  access_type: { type: SchemaTypes.String, enum: ['public', 'private'], default: 'public' },
  access_code: { type: SchemaTypes.String },
  created: { type: SchemaTypes.Number, required: true },
  updated: { type: SchemaTypes.Number, required: true },
  deleted: { type: SchemaTypes.Number, default: null },
};

const modelSchema = new ModelSchema(schemaConfig, {
  collection: modelName,
  toJSON: {
    transform: (doc, ret) => {
      const transformed = { ...ret, id: ret._id };
      delete transformed._id;
      delete transformed.__v;
      return transformed;
    },
  },
});

/** @type {ModelSchema} */
module.exports = DatabaseModel.model(modelName, modelSchema);
