import { Op } from 'sequelize';
import DeliveryProblem from '../models/DeliveryProblem';
import Delivery from '../models/Delivery';
import Deliveryman from '../models/Deliveryman';
import Recipient from '../models/Recipient';

import Queue from '../../lib/Queue';
import CancelDeliveryMail from '../jobs/CancelDeliveryMail';

import { DELIVERY_NOT_FOUND } from '../messages';

class ProblemController {
  /**
   * Retorna todas as encomendas com problemas.
   * @param {*} req
   * @param {*} res
   */
  async index(req, res) {
    const { q } = req.query;
    let where = {};

    if (q) {
      where = {
        description: { [Op.iLike]: `%${q}%` },
      };
    }
    const deliveriesProblems = await DeliveryProblem.findAll({ where });
    return res.json(deliveriesProblems);
  }

  /**
   * Registra um novo problema para a encomenda.
   * @param {*} req
   * @param {*} res
   */
  async store(req, res) {
    const { description, deliverymanId } = req.body;
    const { id: deliveryId } = req.params;

    const delivery = await Delivery.findOne({
      where: {
        id: deliveryId,
        startDate: { [Op.ne]: null },
        canceledAt: null,
        endDate: null,
        deliverymanId,
      },
    });
    if (!delivery) {
      return res.status(400).json({ err: DELIVERY_NOT_FOUND });
    }

    const deliveryProblem = await DeliveryProblem.create({
      deliveryId,
      description,
    });
    return res.status(201).json(deliveryProblem);
  }

  /**
   * Cancelamento da encomenda
   * @param {*} req
   * @param {*} res
   */
  async delete(req, res) {
    const { id: deliveryId } = req.params;

    const delivery = await Delivery.findOne({
      where: {
        id: deliveryId,
        canceledAt: null,
        endDate: null,
      },
    });
    if (!delivery) {
      return res.status(400).json({ err: DELIVERY_NOT_FOUND });
    }

    await delivery.update({ canceledAt: new Date() });

    // enviando email para o entregador
    const deliveryman = await Deliveryman.findByPk(delivery.deliverymanId);
    const recipient = await Recipient.findByPk(delivery.recipientId);
    await Queue.add(CancelDeliveryMail.key, {
      deliveryman,
      recipient,
      delivery,
    });

    return res.json();
  }
}

export default new ProblemController();
