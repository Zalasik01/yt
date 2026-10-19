import { Router } from 'express';
import { video_controller } from '../controllers/video.controller.js';
import { validate } from '../middlewares/validate.js';
import { IdParams } from '../validators/common.validator.js';
import {
  ApproveVideoBody,
  CreateVideoBody,
  ListVideosQuery,
  RejectVideoBody,
  ReviseVideoBody,
} from '../validators/video.validator.js';

export const video_routes = Router();

video_routes.get('/', validate({ query: ListVideosQuery }), video_controller.index);
video_routes.post('/', validate({ body: CreateVideoBody }), video_controller.store);
video_routes.get('/:id', validate({ params: IdParams }), video_controller.show);
video_routes.delete('/:id', validate({ params: IdParams }), video_controller.destroy);
video_routes.post('/:id/approve', validate({ params: IdParams, body: ApproveVideoBody }), video_controller.approve);
video_routes.post('/:id/reject', validate({ params: IdParams, body: RejectVideoBody }), video_controller.reject);
video_routes.post('/:id/revise', validate({ params: IdParams, body: ReviseVideoBody }), video_controller.revise);
video_routes.post('/:id/retry', validate({ params: IdParams }), video_controller.retry);
