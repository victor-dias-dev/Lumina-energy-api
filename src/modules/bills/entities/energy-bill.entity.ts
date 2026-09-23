import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'energy_bills',
  timestamps: true,
  indexes: [
    { fields: ['numero_cliente'] },
    { fields: ['mes_referencia'] },
    {
      unique: true,
      name: 'energy_bills_cliente_mes_unique',
      fields: ['numero_cliente', 'mes_referencia'],
    },
  ],
})
export class EnergyBill extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    field: 'numero_cliente',
  })
  numeroCliente: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    field: 'mes_referencia',
  })
  mesReferencia: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'energia_eletrica_kwh',
  })
  energiaEletricaKwh: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'energia_eletrica_valor',
  })
  energiaEletricaValor: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'energia_sceee_kwh',
  })
  energiaSceeeKwh: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'energia_sceee_valor',
  })
  energiaSceeeValor: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'energia_compensada_kwh',
  })
  energiaCompensadaKwh: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'energia_compensada_valor',
  })
  energiaCompensadaValor: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'contrib_ilum_publica',
  })
  contribIlumPublica: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'consumo_total_kwh',
  })
  consumoTotalKwh: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'valor_total_sem_gd',
  })
  valorTotalSemGd: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'economia_gd',
  })
  economiaGd: number;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;
}
