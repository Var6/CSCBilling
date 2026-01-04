// src/actions/car-actions.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type CarFormData = {
  carNumber: string
  model: string
  insuranceExpiry: string
  rcNumber: string
}

export async function createCar(data: CarFormData) {
  try {
    await prisma.car.create({
      data: {
        carNumber: data.carNumber,
        model: data.model,
        insuranceExpiry: new Date(data.insuranceExpiry),
        rcNumber: data.rcNumber,
      },
    })
    revalidatePath('/fleet')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateCar(id: string, data: CarFormData) {
  try {
    await prisma.car.update({
      where: { id },
      data: {
        carNumber: data.carNumber,
        model: data.model,
        insuranceExpiry: new Date(data.insuranceExpiry),
        rcNumber: data.rcNumber,
      },
    })
    revalidatePath('/fleet')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteCar(id: string) {
  try {
    await prisma.car.delete({
      where: { id },
    })
    revalidatePath('/fleet')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCars() {
  try {
    const cars = await prisma.car.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return cars
  } catch (error) {
    return []
  }
}