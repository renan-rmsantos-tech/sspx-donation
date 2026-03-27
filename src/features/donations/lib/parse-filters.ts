export interface DonationFilters {
  donationType?: 'monetary' | 'physical';
  dateFrom?: Date;
  dateTo?: Date;
  donorName?: string;
  page: number;
}

/**
 * Parse and validate URL searchParams into a typed DonationFilters object.
 * Invalid values are silently ignored and omitted from the result.
 * No exceptions are thrown.
 */
export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>
): DonationFilters {
  const filters: DonationFilters = {
    page: 1,
  };

  // Parse donationType - must be exactly 'monetary' or 'physical'
  if (searchParams.donationType) {
    const type = Array.isArray(searchParams.donationType)
      ? searchParams.donationType[0]
      : searchParams.donationType;

    if (type === 'monetary' || type === 'physical') {
      filters.donationType = type;
    }
  }

  // Parse dateFrom - must be valid ISO date string
  if (searchParams.dateFrom) {
    const dateStr = Array.isArray(searchParams.dateFrom)
      ? searchParams.dateFrom[0]
      : searchParams.dateFrom;

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      filters.dateFrom = date;
    }
  }

  // Parse dateTo - must be valid ISO date string
  if (searchParams.dateTo) {
    const dateStr = Array.isArray(searchParams.dateTo)
      ? searchParams.dateTo[0]
      : searchParams.dateTo;

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      filters.dateTo = date;
    }
  }

  // Parse donorName - trim whitespace, omit if empty
  if (searchParams.donorName) {
    const name = Array.isArray(searchParams.donorName)
      ? searchParams.donorName[0]
      : searchParams.donorName;

    const trimmed = name.trim();
    if (trimmed) {
      filters.donorName = trimmed;
    }
  }

  // Parse page - must be positive integer ≥ 1
  if (searchParams.page) {
    const pageStr = Array.isArray(searchParams.page)
      ? searchParams.page[0]
      : searchParams.page;

    const pageNum = parseInt(pageStr, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      filters.page = pageNum;
    }
  }

  return filters;
}
