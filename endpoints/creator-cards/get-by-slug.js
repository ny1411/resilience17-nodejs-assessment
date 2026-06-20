const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const getCreatorCardBySlugService = require('@app/services/creator-cards/get-by-slug');

module.exports = createHandler({
  path: '/:slug',
  method: 'get',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info({ requestContext: rc, response: rs }, 'get-creator-card-completed');
  },
  async handler(rc, helpers) {
    const { slug } = rc.params;
    const accessCode = rc.query.access_code;

    const response = await getCreatorCardBySlugService({ slug, accessCode });
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      data: response,
    };
  },
});
