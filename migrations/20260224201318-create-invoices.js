'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      mes_referencia: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ano_referencia: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      pdf_filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      pdf_storage_path: {
        type: Sequelize.STRING
      },
      raw_llm_response: {
        type: Sequelize.JSON
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PROCESSING'
      },
      error_message: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('invoices', [
      'customer_id',
      'ano_referencia',
      'mes_referencia'
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoices');
  }
};
