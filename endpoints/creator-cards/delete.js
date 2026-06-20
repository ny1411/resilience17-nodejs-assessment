const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const deleteCreatorCardService = require('@app/services/creator-cards/delete');

module.exports = createHandler({
  path: '/:slug',
  method: 'delete',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info({ requestContext: rc, response: rs }, 'delete-creator-card-completed');
  },
  async handler(rc, helpers) {
    const { slug } = rc.params;
    const payload = rc.body;

    const response = await deleteCreatorCardService({ slug, serviceData: payload });
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      data: response,
    };
  },
});
