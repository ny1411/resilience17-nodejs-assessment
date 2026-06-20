const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { CreatorCard } = require('@app/models');

const deleteSpec = `root {
  creator_reference string<length:20>
}`;

const parsedSpec = validator.parse(deleteSpec);

async function deleteCreatorCardService({ slug, serviceData }) {
  const validatedData = validator.validate(serviceData, parsedSpec);

  const card = await CreatorCard.findOne({ slug, deleted: null });

  if (!card) {
    throwAppError('Creator card not found', 'NF01');
  }

  card.deleted = Date.now();
  await card.save();

  return card.toJSON();
}

module.exports = deleteCreatorCardService;
