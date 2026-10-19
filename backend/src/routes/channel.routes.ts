import { Router } from 'express';
import { channel_controller } from '../controllers/channel.controller.js';
import { validate } from '../middlewares/validate.js';
import { CreateChannelBody, UpdateChannelBody } from '../validators/channel.validator.js';
import { IdParams } from '../validators/common.validator.js';

export const channel_routes = Router();

channel_routes.get('/', channel_controller.index);
channel_routes.post('/', validate({ body: CreateChannelBody }), channel_controller.store);
channel_routes.get('/:id', validate({ params: IdParams }), channel_controller.show);
channel_routes.patch('/:id', validate({ params: IdParams, body: UpdateChannelBody }), channel_controller.update);
channel_routes.delete('/:id', validate({ params: IdParams }), channel_controller.destroy);
channel_routes.get('/:id/youtube/auth-url', validate({ params: IdParams }), channel_controller.youtubeAuthUrl);
channel_routes.delete('/:id/youtube', validate({ params: IdParams }), channel_controller.youtubeDisconnect);
