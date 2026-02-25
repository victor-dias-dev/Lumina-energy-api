'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoice_metrics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      invoice_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'invoices',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      energia_eletrica_kwh: Sequelize.FLOAT,
      energia_eletrica_valor: Sequelize.FLOAT,
      energia_sceee_kwh: Sequelize.FLOAT,
      energia_sceee_valor: Sequelize.FLOAT,
      energia_compensada_kwh: Sequelize.FLOAT,
      energia_compensada_valor: Sequelize.FLOAT,
      contrib_ilum_valor: Sequelize.FLOAT,

      consumo_total_kwh: Sequelize.FLOAT,
      valor_total_sem_gd: Sequelize.FLOAT,
      economia_gd: Sequelize.FLOAT,

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoice_metrics');
  }
};
