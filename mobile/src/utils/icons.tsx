import React from 'react';
import { Utensils, Car, ShoppingBag, Film, Home, Wallet, Tag } from 'lucide-react-native';

interface CategoryIconProps {
  categoryId: number;
  color: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, color, size = 20 }) => {
  switch (categoryId) {
    case 1:
      return <Utensils size={size} color={color} />;
    case 2:
      return <Car size={size} color={color} />;
    case 3:
      return <ShoppingBag size={size} color={color} />;
    case 4:
      return <Film size={size} color={color} />;
    case 5:
      return <Home size={size} color={color} />;
    case 6:
      return <Wallet size={size} color={color} />;
    case 7:
      return <Tag size={size} color={color} />;
    default:
      return <Wallet size={size} color={color} />;
  }
};

export const getCategoryName = (categoryId: number): string => {
  switch (categoryId) {
    case 1: return 'Food & Drink';
    case 2: return 'Transport';
    case 3: return 'Shopping';
    case 4: return 'Entertainment';
    case 5: return 'Housing';
    case 6: return 'Income';
    case 7: return 'Other';
    default: return 'Expense';
  }
};
