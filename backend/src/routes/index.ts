import { Router } from 'express';
import { factory_controller } from '../controllers/factory.controller.js';
import { media_controller } from '../controllers/media.controller.js';
import { meta_controller } from '../controllers/meta.controller.js';
import { youtube_controller } from '../controllers/youtube.controller.js';
import { apiKeyAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { LogsQuery, MediaQuery } from '../validators/factory.validator.js';
import { channel_routes } from './channel.routes.js';
import { video_routes } from './video.routes.js';

export const api_v1 = Router();

// Públicas
api_v1.get('/health', meta_controller.health);
api_v1.get('/youtube/callback', youtube_controller.callback);

// Protegidas
api_v1.use(apiKeyAuth);
api_v1.get('/meta/options', meta_controller.options);
api_v1.get('/factory/status', factory_controller.status);
api_v1.get('/factory/logs', validate({ query: LogsQuery }), factory_controller.logs);
api_v1.get('/media', validate({ query: MediaQuery }), media_controller.show);
api_v1.use('/channels', channel_routes);
api_v1.use('/videos', video_routes);
