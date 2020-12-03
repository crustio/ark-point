import {Request, Response} from 'express';
import * as db from '../db';
import ChainService from './chainService';

export default class ApiService {
  async queryNodeEraStatusOverview(req: Request, res: Response) {
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const currentPage = req.query.currentPage
      ? Number(req.query.currentPage)
      : 1;
    const flag = await db.flags();
    const points =  await db.queryNodeEraStatusOverview(
        Number(currentPage),
        Number(pageSize)
    )
    for (const point of points) {
      if (point.pointInCycle.length < flag.erasCycle-1) {
        point.pointInCycle = this.unSavedInCycle(flag.erasCycle, point.pointInCycle);
      }
    }

    res.send({
      message: 'success',
      code: 1,
      data: {
        currentPage,
        pageSize,
        total: await db.totalNodeCount(),
        data: points,
      },
    });
  }

  async totalStorage(req: Request, res: Response, chainService: ChainService) {
    res.send({
      message: 'success',
      code: 1,
      data: await chainService.totalCapacity(),
    });
  }

  unSavedInCycle(currentCycle: number, pointInCycle: any[]) {
    for(let i = 1; i < currentCycle; i++) {
      pointInCycle.push({
        index: i,
        point: 0
      })
    }
    return pointInCycle;
  }
}
