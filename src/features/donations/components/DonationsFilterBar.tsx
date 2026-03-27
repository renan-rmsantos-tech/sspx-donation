'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DonationFilters } from '../lib/parse-filters';

interface DonationsFilterBarProps {
  filters: DonationFilters;
}

export function DonationsFilterBar({ filters }: DonationsFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [donorName, setDonorName] = useState(filters.donorName || '');
  const donorNameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    router.push(`/admin/financeiro?${params.toString()}`);
  }, [searchParams, router]);

  // Handle donor name debouncing
  useEffect(() => {
    if (donorNameTimeoutRef.current) {
      clearTimeout(donorNameTimeoutRef.current);
    }

    donorNameTimeoutRef.current = setTimeout(() => {
      handleFilterChange('donorName', donorName);
    }, 300);

    return () => {
      if (donorNameTimeoutRef.current) {
        clearTimeout(donorNameTimeoutRef.current);
      }
    };
  }, [donorName, handleFilterChange]);

  const handleClearFilters = () => {
    router.push('/admin/financeiro?page=1');
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-6 rounded-lg border border-[#EDE5DA]">
      <div className="flex gap-4">
        {/* Donation Type Filter */}
        <div className="flex-1">
          <label className="text-sm text-[#9B7B5A] mb-2 block">Tipo de Doação</label>
          <Select
            value={filters.donationType || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                handleFilterChange('donationType', null);
              } else {
                handleFilterChange('donationType', value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="monetary">Monetária</SelectItem>
              <SelectItem value="physical">Promessa de Item</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From Filter */}
        <div className="flex-1">
          <label className="text-sm text-[#9B7B5A] mb-2 block">Data De</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                {filters.dateFrom
                  ? format(filters.dateFrom, 'dd/MM/yyyy', { locale: ptBR })
                  : 'Selecionar data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => {
                  if (date) {
                    handleFilterChange('dateFrom', date.toISOString().split('T')[0]);
                  }
                }}
                disabled={(date) =>
                  filters.dateTo ? date > filters.dateTo : false
                }
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To Filter */}
        <div className="flex-1">
          <label className="text-sm text-[#9B7B5A] mb-2 block">Data Até</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                {filters.dateTo
                  ? format(filters.dateTo, 'dd/MM/yyyy', { locale: ptBR })
                  : 'Selecionar data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => {
                  if (date) {
                    handleFilterChange('dateTo', date.toISOString().split('T')[0]);
                  }
                }}
                disabled={(date) =>
                  filters.dateFrom ? date < filters.dateFrom : false
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Donor Name Filter */}
        <div className="flex-1">
          <label className="text-sm text-[#9B7B5A] mb-2 block">Nome do Doador</label>
          <Input
            placeholder="Filtrar por nome..."
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="w-full"
          >
            Limpar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
