import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('The customer informed does not exists.', 400);
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (!findProducts) {
      throw new AppError('None of the sent produts were found.', 400);
    }

    const mapProducts = products.map(product => {
      const findProduct = findProducts.find(prod => prod.id === product.id);

      if (!findProduct) {
        throw new AppError('Some of the products sent were not found.', 400);
      }

      if (findProduct.quantity - product.quantity < 0) {
        throw new AppError(
          'There are no sufficient units of one of the products in stock',
          400,
        );
      }

      return {
        product_id: product.id,
        quantity: product.quantity,
        price: findProduct.price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: mapProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
