import { IELTSWritingTask } from '../types';

/**
 * Static Task Bank for IELTS Writing Sim
 * Used as fallback when AI generation fails or user is offline
 */

// Task 1 Bank - Graph/Chart/Table Descriptions
export const TASK_1_BANK: IELTSWritingTask[] = [
  {
    type: 'Task 1',
    prompt: 'The bar chart illustrates the percentage of government spending on education, healthcare, and infrastructure in four different countries (A, B, C, D) in 2023. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: 'Country A spent 30% on education, 25% on healthcare, and 15% on infrastructure. Country B prioritized healthcare with 35%, while education received 20% and infrastructure 10%. Country C showed balanced spending at 25% each. Country D focused on infrastructure at 40%, with education at 15% and healthcare at 20%.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Education & Healthcare)', 'Body Paragraph 2 (Infrastructure)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The line graph shows the population growth in three major cities from 1990 to 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: 'City A started at 2 million in 1990 and grew steadily to 3.5 million by 2020. City B began at 1.5 million, peaked at 2.8 million in 2010, then declined to 2.2 million by 2020. City C showed the most dramatic increase, starting at 500,000 and reaching 2.5 million by 2020.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Cities A & B)', 'Body Paragraph 2 (City C)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The pie charts compare the household spending patterns in two countries (Country X and Country Y) in 2022. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: 'Country X: Housing 30%, Food 25%, Transportation 15%, Entertainment 10%, Healthcare 10%, Other 10%. Country Y: Food 35%, Housing 20%, Transportation 20%, Healthcare 15%, Entertainment 5%, Other 5%.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Major Categories)', 'Body Paragraph 2 (Other Categories)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The table below shows the average monthly temperatures and rainfall in three cities. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: 'City A: Jan 5°C/80mm, Apr 15°C/60mm, Jul 28°C/20mm, Oct 12°C/70mm. City B: Jan 25°C/150mm, Apr 28°C/100mm, Jul 30°C/50mm, Oct 27°C/120mm. City C: Jan -5°C/40mm, Apr 8°C/50mm, Jul 22°C/80mm, Oct 5°C/60mm.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Temperature)', 'Body Paragraph 2 (Rainfall)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The diagram shows the process of recycling plastic bottles. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: 'The process involves 7 stages: 1) Collection of plastic bottles from recycling bins, 2) Transportation to recycling facility, 3) Sorting by type and color, 4) Washing and cleaning, 5) Shredding into small flakes, 6) Melting and forming pellets, 7) Manufacturing new products.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Collection to Sorting)', 'Body Paragraph 2 (Processing to Manufacturing)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The map shows the development of a village from 1995 to present. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: '1995: Small village with 50 houses, one primary school, a post office, and farmland surrounding the village. Present: Expanded to 200 houses, new secondary school, shopping center, medical clinic, and the farmland has been converted to a residential area.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Residential Changes)', 'Body Paragraph 2 (Facilities)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The bar chart shows the percentage of people in different age groups who use social media platforms. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: 'Age 13-17: Facebook 60%, Instagram 85%, TikTok 90%, Twitter 30%. Age 18-24: Facebook 70%, Instagram 80%, TikTok 75%, Twitter 45%. Age 25-34: Facebook 85%, Instagram 65%, TikTok 40%, Twitter 50%. Age 35-44: Facebook 80%, Instagram 45%, TikTok 25%, Twitter 40%. Age 45+: Facebook 75%, Instagram 25%, TikTok 15%, Twitter 35%.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Younger Groups)', 'Body Paragraph 2 (Older Groups)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The two maps compare the layout of a university campus in 2000 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: '2000: One library, two lecture halls, one cafeteria, small parking lot, and green areas. 2020: Two libraries (new one added), four lecture halls (two new), two cafeterias, large parking structure, new sports complex, and reduced green areas.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Academic Buildings)', 'Body Paragraph 2 (Facilities & Grounds)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The flow chart illustrates the production of chocolate from cocoa beans. Summarize the information by selecting and reporting the main features.',
    source_text: 'Process stages: 1) Harvesting cocoa pods from trees, 2) Extracting beans from pods, 3) Fermenting beans for 5-7 days, 4) Drying beans in the sun, 5) Roasting at 120-150°C, 6) Winnowing to remove shells, 7) Grinding into cocoa mass, 8) Pressing to separate cocoa butter and powder, 9) Mixing with sugar and milk, 10) Conching and tempering, 11) Molding into final product.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (Harvesting to Roasting)', 'Body Paragraph 2 (Processing to Final Product)'],
    time_limit: 1200
  },
  {
    type: 'Task 1',
    prompt: 'The table shows the top five countries with the highest number of international tourists in 2019 and 2022. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
    source_text: '2019: France (89 million), Spain (84 million), USA (79 million), China (66 million), Italy (65 million). 2022: France (82 million), Spain (72 million), USA (51 million), Italy (50 million), Turkey (47 million). Note: China dropped to 35 million, Turkey entered top 5.',
    suggested_structure: ['Introduction', 'Overview', 'Body Paragraph 1 (2019 Rankings)', 'Body Paragraph 2 (2022 Rankings & Changes)'],
    time_limit: 1200
  }
];

// Task 2 Bank - Essay Topics
export const TASK_2_BANK: IELTSWritingTask[] = [
  {
    type: 'Task 2',
    prompt: 'Some people believe that university education should be free for everyone, while others think that students should pay for their own education. Discuss both views and give your own opinion.',
    suggested_structure: ['Introduction', 'Viewpoint 1 (Free Education)', 'Viewpoint 2 (Paid Education)', 'Conclusion & Opinion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'In many countries, the level of crime is increasing. What do you think are the main causes of crime? What measures can be taken to reduce crime?',
    suggested_structure: ['Introduction', 'Causes of Crime', 'Solutions', 'Conclusion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Some people think that it is better to educate boys and girls in separate schools. Others, however, believe that mixed schools are better. Discuss both views and give your own opinion.',
    suggested_structure: ['Introduction', 'Single-sex Schools', 'Mixed Schools', 'Conclusion & Opinion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Nowadays many people work from home using the internet. Do the advantages of this trend outweigh the disadvantages?',
    suggested_structure: ['Introduction', 'Advantages', 'Disadvantages', 'Conclusion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Some people believe that governments should spend more money on space exploration, while others think that this money should be spent on solving problems on Earth. Discuss both views and give your own opinion.',
    suggested_structure: ['Introduction', 'Space Exploration', 'Earth Problems', 'Conclusion & Opinion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'In some countries, young people are encouraged to work or travel for a year between finishing high school and starting university. Do the advantages of this outweigh the disadvantages?',
    suggested_structure: ['Introduction', 'Advantages', 'Disadvantages', 'Conclusion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Some people think that environmental problems are too big for individuals to solve. Others believe that individuals can take action to solve these problems. Discuss both views and give your own opinion.',
    suggested_structure: ['Introduction', 'Problems Too Big', 'Individual Action', 'Conclusion & Opinion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'In many countries, traditional foods are being replaced by international fast food. Some people think this has negative effects on both families and society. To what extent do you agree or disagree?',
    suggested_structure: ['Introduction', 'Effects on Families', 'Effects on Society', 'Conclusion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Some people think that children should start formal education at a very young age. Others believe they should spend more time playing. Discuss both views and give your own opinion.',
    suggested_structure: ['Introduction', 'Early Formal Education', 'More Play Time', 'Conclusion & Opinion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Many people believe that social media has had a negative impact on society. To what extent do you agree or disagree?',
    suggested_structure: ['Introduction', 'Negative Impacts', 'Positive Impacts', 'Conclusion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Some people think that the best way to reduce crime is to give longer prison sentences. Others think there are better alternatives. Discuss both views and give your own opinion.',
    suggested_structure: ['Introduction', 'Longer Sentences', 'Alternatives', 'Conclusion & Opinion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'In many countries, people are living longer. What problems does this cause? What solutions can you suggest?',
    suggested_structure: ['Introduction', 'Problems', 'Solutions', 'Conclusion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Some people think that professional athletes earn too much money. Others believe they deserve their high salaries. Discuss both views and give your own opinion.',
    suggested_structure: ['Introduction', 'Too Much Money', 'Deserved Salaries', 'Conclusion & Opinion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Some people believe that children should be taught to be competitive in school. Others think that cooperation is more important. Discuss both views and give your own opinion.',
    suggested_structure: ['Introduction', 'Competition', 'Cooperation', 'Conclusion & Opinion'],
    time_limit: 2400
  },
  {
    type: 'Task 2',
    prompt: 'Many countries are experiencing serious traffic congestion. What are the causes of this problem? What measures can be taken to solve it?',
    suggested_structure: ['Introduction', 'Causes', 'Solutions', 'Conclusion'],
    time_limit: 2400
  }
];

/**
 * Get a random task from the bank
 * @param type - Task 1 or Task 2
 * @returns A random IELTSWritingTask
 */
export const getRandomTask = (type: 'Task 1' | 'Task 2'): IELTSWritingTask => {
  const bank = type === 'Task 1' ? TASK_1_BANK : TASK_2_BANK;
  const randomIndex = Math.floor(Math.random() * bank.length);
  return { ...bank[randomIndex] };
};

/**
 * Get multiple random tasks (for variety)
 * @param type - Task 1 or Task 2
 * @param count - Number of tasks to return
 * @returns Array of unique IELTSWritingTask
 */
export const getRandomTasks = (type: 'Task 1' | 'Task 2', count: number): IELTSWritingTask[] => {
  const bank = type === 'Task 1' ? TASK_1_BANK : TASK_2_BANK;
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, bank.length)).map(task => ({ ...task }));
};

/**
 * Get task bank size
 */
export const getBankSize = (type: 'Task 1' | 'Task 2'): number => {
  return type === 'Task 1' ? TASK_1_BANK.length : TASK_2_BANK.length;
};
