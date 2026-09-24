'use strict';

const TABLE = 'energy_bills';
const UNIQUE_INDEX = 'energy_bills_cliente_mes_unique';

function tableExists(tables, name) {
  return tables.some((table) => {
    const value =
      typeof table === 'string'
        ? table
        : table.tableName || table.table_name || '';
    return String(value).toLowerCase() === name;
  });
}

function hasUniqueClienteMes(indexes) {
  return indexes.some((index) => {
    if (!index.unique) return false;
    const fields = (index.fields || []).map((field) =>
      String(field.attribute || field.name || field).toLowerCase(),
    );
    return fields.includes('numero_cliente') && fields.includes('mes_referencia');
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const exists = tableExists(tables, TABLE);

    if (!exists) {
      await queryInterface.createTable(TABLE, {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        numero_cliente: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        mes_referencia: {
          type: Sequelize.STRING(10),
          allowNull: false,
        },
        energia_eletrica_kwh: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        energia_eletrica_valor: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        energia_sceee_kwh: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        energia_sceee_valor: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        energia_compensada_kwh: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        energia_compensada_valor: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        contrib_ilum_publica: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        consumo_total_kwh: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        valor_total_sem_gd: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        economia_gd: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });

      await queryInterface.addIndex(TABLE, ['numero_cliente']);
      await queryInterface.addIndex(TABLE, ['mes_referencia']);
    }

    const indexes = await queryInterface.showIndex(TABLE);
    if (!hasUniqueClienteMes(indexes)) {
      await queryInterface.addIndex(TABLE, ['numero_cliente', 'mes_referencia'], {
        unique: true,
        name: UNIQUE_INDEX,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE);
  },
};
