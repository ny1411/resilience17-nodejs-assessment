const crypto = require('crypto');
const { ulid } = require('ulid');
const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { CreatorCard } = require('@app/models');

const createSpec = `root {
  title string<minLength:3|maxLength:100>
  description? string<maxLength:500>
  slug? string<minLength:5|maxLength:50>
  creator_reference string<length:20>
  status string(draft|published)
  access_type? string(public|private)
  access_code? string
  links[]? {
    title string<minLength:1|maxLength:100>
    url string<maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<minLength:3|maxLength:100>
      description? string<maxLength:250>
      amount number<min:1>
    }
  }
}`;

const parsedSpec = validator.parse(createSpec);

async function createCreatorCardService(serviceData) {
  // 1. Validate incoming data
  const validatedData = validator.validate(serviceData, parsedSpec);

  // 2. Slug Auto-Generation
  let finalSlug = validatedData.slug;
  if (!finalSlug) {
    // lowercase, replace spaces with hyphens, strip invalid characters
    let autoSlug = validatedData.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');

    // check if it is < 5 chars or exists
    const existingSlug = await CreatorCard.findOne({ slug: autoSlug }).select('slug').lean();
    if (autoSlug.length < 5 || existingSlug) {
      const suffix = crypto.randomBytes(3).toString('hex');
      autoSlug = `${autoSlug}-${suffix}`;
    }
    finalSlug = autoSlug;
  } else {
    // if slug provided, validate uniqueness
    const existingSlug = await CreatorCard.findOne({ slug: finalSlug }).select('slug').lean();
    if (existingSlug) {
      throwAppError('Slug already exists', 'SL02');
    }
  }

  // 3. Error Handling for Access Types
  const accessType = validatedData.access_type || 'public';
  if (accessType === 'private') {
    if (!validatedData.access_code) {
      throwAppError('Private access type requires an access code', 'AC01');
    }
  } else if (accessType === 'public') {
    if (validatedData.access_code) {
      throwAppError('Public access type should not have an access code', 'AC05');
    }
  }

  // 4. Finalize Creation
  const newCardData = {
    ...validatedData,
    _id: ulid(),
    slug: finalSlug,
    access_type: accessType,
    created: Date.now(),
    updated: Date.now(),
  };

  const creatorCard = await CreatorCard.create(newCardData);

  return creatorCard.toJSON();
}

module.exports = createCreatorCardService;
