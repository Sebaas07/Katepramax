

const svc = require("../services/reporte.service");

async function arqueoSemanal(req, reply) {
  return reply.send(await svc.arqueoSemanal(req.server, Number(req.query.semana)));
}

async function panelGeneral(req, reply) {
  return reply.send(await svc.panelGeneral(req.server, req.query.fecha));
}

async function historialSemanal(req, reply) {
  return reply.send(
    await svc.historialSemanal(req.server, {
      skip: Number(req.query.skip ?? 0),
      take: Number(req.query.take ?? 20),
    }),
  );
}

module.exports = { arqueoSemanal, panelGeneral, historialSemanal };
