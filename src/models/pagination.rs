use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

impl Default for PageParams {
    fn default() -> Self {
        Self {
            page: Some(1),
            limit: Some(20),
        }
    }
}

impl PageParams {
    pub fn get_page(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn get_limit(&self) -> i64 {
        let lim = self.limit.unwrap_or(20);
        if lim == 0 {
            20
        } else {
            lim.min(100)
        }
    }

    pub fn get_offset(&self) -> i64 {
        (self.get_page() - 1) * self.get_limit()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub page: i64,
    pub limit: i64,
    pub total: i64,
    pub has_more: bool,
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, page: i64, limit: i64, total: i64) -> Self {
        let has_more = (page * limit) < total;
        Self {
            data,
            page,
            limit,
            total,
            has_more,
        }
    }
}
