const { throwAppError } = require('@app-core/errors');
const { CreatorCard } = require('@app/models');

async function getCreatorCardBySlugService({ slug, accessCode }) {
  // 1. Fetch card by slug and ensure it hasn't been soft-deleted
  const card = await CreatorCard.findOne({ slug, deleted: null });

  if (!card) {
    throwAppError('Creator card not found', 'NF01');
  }

  // 2. Check if the card is in a draft state
  if (card.status === 'draft') {
    throwAppError('Card is not publicly available', 'NF02');
  }

  // 3. Apply private access rules
  if (card.access_type === 'private') {
    if (!accessCode) {
      throwAppError('Private access type requires an access code', 'AC03');
    }
    if (card.access_code !== accessCode) {
      throwAppError('Invalid access code provided', 'AC04');
    }
  }

  // 4. Finalize Response: remove access_code from JSON payload
  const cardJson = card.toJSON();
  delete cardJson.access_code;

  return cardJson;
}

module.exports = getCreatorCardBySlugService;
