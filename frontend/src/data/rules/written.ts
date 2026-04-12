

export const WRITTEN_RULES: Record<number, string> = {
    20: "Subject-Verb Agreement with prepositional interference. Generate sentence where subject and verb are separated by prepositional phrase(s). Place error: use verb agreeing with object of preposition, not actual subject. Example: 'The quality {A}of{/A} the products {B}were{/B} excellent {C}yesterday{/C}' — error at B (were→was).",

    21: "Agreement with quantity expressions (all/most/some/half of). Generate sentence with 'quantity + of + noun'. Place error: verb disagrees with the OBJECT of 'of'. Example: 'All {A}of{/A} the research {B}were{/B} completed {C}successfully{/C}' — error at B (were→was, agrees with 'research' not 'all').",

    22: "Inverted subject-verb agreement. Generate sentence with inversion (question, place expression, or negative). Place error: verb disagrees with post-verb subject. Example: 'Rarely {A}has{/A} such discoveries {B}been{/B} made {C}in this field{/C}' — error at A (has→have, agrees with 'discoveries').",

    23: "Indefinite pronoun agreement (anybody, everyone, each, every). Generate sentence with indefinite pronoun subject. Place error: use plural verb with singular indefinite. Example: 'Everyone {A}in{/A} the laboratories {B}were{/B} required {C}to attend{/C}' — error at B (were→was).",

    24: "Parallel structure with and/but/or. Generate sentence listing 2-3 items joined by coordinator. Place error: one item has different grammatical form. Example: 'The study involves {A}collecting{/A} data, {B}to analyze{/B} results, and {C}writing{/C} reports' — error at B (to analyze→analyzing).",

    25: "Paired conjunctions (both...and, either...or, neither...nor, not only...but also). Generate sentence with paired conjunction. Place error: non-parallel elements after the pair. Example: 'The theory is {A}not only{/A} innovative {B}but also{/B} {C}having practical applications{/C}' — error at C (having→has / it has).",

    26: "Comparison parallelism. Generate comparison sentence (than, as...as). Place error: compared items not parallel. Example: 'His research {A}is{/A} more comprehensive {B}than{/B} {C}the other scientists{/C}' — error at C (scientists→the other scientists' research / that of...).",

    27: "Comparative/Superlative form choice. Generate sentence comparing 2 items (comparative) or 3+ items (superlative). Place error: use superlative for 2 items or comparative for 3+. Example: 'Of the two theories, this one {A}is{/A} the {B}most{/B} plausible {C}explanation{/C}' — error at B (most→more).",

    28: "Double comparative/superlative. Generate sentence with comparative or superlative. Place error: use both -er AND more, or both -est AND most. Example: 'This method {A}is{/A} {B}more easier{/B} to implement {C}than{/C} the previous one' — error at B (more easier→easier).",

    29: "The...the comparative structure. Generate 'the + comparative...the + comparative' sentence. Place error: non-parallel clauses or missing 'the'. Example: '{A}The more{/A} data we collect, {B}more accurate{/B} the results {C}become{/C}' — error at B (more accurate→the more accurate).",

    30: "Perfect tense after have/has/had. Generate sentence with have/has/had. Place error: use base form or simple past instead of past participle (V3). Example: 'The researchers {A}have{/A} {B}conduct{/B} several experiments {C}since{/C} January' — error at B (conduct→conducted).",

    31: "Verb form after 'be'. Generate sentence with be + verb. Place error: use wrong form (need V-ing for active progressive, V3 for passive). Example: 'The samples {A}are{/A} {B}analyze{/B} in the laboratory {C}every week{/C}' — error at B (analyze→being analyzed / analyzed).",

    32: "Verb form after modals (will, would, can, should, must). Generate sentence with modal. Place error: use V-ing or V3 instead of base form. Example: 'The experiment {A}should{/A} {B}conducting{/B} under controlled {C}conditions{/C}' — error at B (conducting→be conducted / conduct).",

    33: "Sequence of tenses. Generate complex sentence with time relationship. Place error: illogical tense sequence (e.g., past main + present dependent). Example: 'The study {A}showed{/A} that climate change {B}is{/B} affecting {C}polar regions{/C}' — error at B (is→was, or showed→shows).",

    34: "Present Perfect vs Past Perfect. Generate sentence with time marker. Place error: use present perfect with 'by [past year]' or past perfect with 'since'. Example: 'By 1995, scientists {A}have{/A} discovered {B}several{/B} new species {C}in the region{/C}' — error at A (have→had).",

    35: "Time expression + tense mismatch. Generate sentence with specific time marker. Place error: tense doesn't match time expression. Example: '{A}Since{/A} 1990, the population {B}increased{/B} by {C}30 percent{/C}' — error at B (increased→has increased).",

    36: "Will vs Would. Generate conditional or future sentence. Place error: use 'will' in hypothetical/unreal condition or 'would' in real future. Example: 'If the temperature {A}were{/A} higher, the reaction {B}will{/B} occur {C}faster{/C}' — error at B (will→would).",

    37: "Passive voice formation. Generate passive sentence. Place error: missing 'be' or wrong participle form. Example: 'The data {A}collected{/A} by researchers {B}from{/B} various {C}institutions{/C}' — error at A (collected→was collected / were collected).",

    38: "Active vs Passive voice logic. Generate sentence where subject receives action. Place error: use active voice when passive needed. Example: 'The hypothesis {A}tested{/A} multiple times {B}before{/B} publication {C}last year{/C}' — error at A (tested→was tested).",

    39: "Singular/Plural noun with determiners. Generate sentence with determiner + noun. Place error: singular determiner + plural noun or vice versa. Example: '{A}Each{/A} of the {B}experiments{/B} {C}were{/C} carefully documented' — error at C (were→was, 'each' is singular).",

    40: "Countable/Uncountable noun quantifiers. Generate sentence with quantifier. Place error: use 'many/few' with uncountable or 'much/little' with countable. Example: 'The study required {A}many{/A} {B}equipment{/B} and {C}resources{/C}' — error at A (many→much, 'equipment' is uncountable).",

    41: "Irregular plural forms. Generate sentence with irregular plural. Place error: use regular -s plural for irregular noun. Example: 'The {A}childs{/A} in the study {B}showed{/B} significant {C}improvement{/C}' — error at A (childs→children).",

    42: "Person vs Thing noun confusion. Generate sentence requiring person or thing noun. Place error: use wrong category. Example: 'The {A}authority{/A} of the book {B}conducted{/B} extensive {C}research{/C}' — error at A (authority→author, need person not abstract concept).",

    43: "Subject vs Object pronouns. Generate sentence with pronoun as subject or object. Place error: use object pronoun as subject or vice versa. Example: '{A}Him{/A} and his colleagues {B}published{/B} the findings {C}last month{/C}' — error at A (Him→He).",

    44: "Possessive adjective vs pronoun. Generate sentence with possessive. Place error: use possessive adjective without noun or pronoun with noun. Example: 'The results are {A}their{/A}, not {B}ours{/B} {C}data{/C}' — error at B (ours→our, needs noun 'data').",

    45: "Pronoun-antecedent agreement. Generate sentence with pronoun referring to noun. Place error: pronoun doesn't match antecedent in number/gender. Example: 'Each scientist {A}must{/A} submit {B}their{/B} report {C}by Friday{/C}' — error at B (their→his or her, 'each' is singular).",

    46: "Adjective vs Adverb form. Generate sentence needing adverb to modify verb. Place error: use adjective instead. Example: 'The experiment {A}was{/A} conducted {B}careful{/B} to avoid {C}contamination{/C}' — error at B (careful→carefully).",

    47: "Adjective after linking verb. Generate sentence with linking verb (be, seem, appear, feel). Place error: use adverb instead of adjective. Example: 'The results {A}appeared{/A} {B}significantly{/B} different {C}from{/C} expectations' — error at B (significantly→significant).",

    48: "Adjective position error. Generate sentence with adjective. Place error: place adverb between verb and object. Example: 'Scientists {A}analyzed{/A} {B}carefully{/B} the data {C}collected{/C}' — error at B (carefully→move after 'data' or before 'analyzed').",

    49: "-ly adjectives (friendly, lovely, costly). Generate sentence with -ly adjective. Place error: treat it as adverb or add -ly again. Example: 'The {A}costly{/A} equipment {B}was{/B} maintained {C}costlyly{/C}' — error at C (costlyly→in a costly manner / expensively).",

    50: "Predicate adjectives (alive, afraid, asleep, alike). Generate sentence with predicate adjective. Place error: place it before noun instead of after linking verb. Example: 'The {A}alive{/A} organisms {B}were{/B} studied {C}extensively{/C}' — error at A (alive→living, predicate adjectives can't precede nouns).",

    51: "-ed vs -ing adjectives. Generate sentence with participial adjective. Place error: use -ing for receiver of feeling or -ed for cause. Example: 'The researchers {A}were{/A} {B}exciting{/B} about the {C}discovery{/C}' — error at B (exciting→excited).",

    52: "Article with singular countable noun. Generate sentence with singular countable noun. Place error: omit article/determiner. Example: '{A}Scientist{/A} conducted {B}the{/B} experiment {C}carefully{/C}' — error at A (Scientist→A scientist / The scientist).",

    53: "A vs An. Generate sentence with 'a' or 'an'. Place error: use 'a' before vowel sound or 'an' before consonant sound. Example: 'The study used {A}a{/A} {B}innovative{/B} approach {C}to{/C} data collection' — error at A (a→an, 'innovative' starts with vowel sound).",

    54: "This/That vs These/Those. Generate sentence with demonstrative. Place error: use singular demonstrative with plural noun or vice versa. Example: '{A}This{/A} {B}findings{/B} suggest {C}significant{/C} implications' — error at A (This→These, 'findings' is plural).",

    55: "Specific vs General article use. Generate sentence requiring 'the' for specific reference. Place error: omit 'the' or use 'a'. Example: 'Researchers analyzed {A}data{/A} collected {B}from{/B} {C}the{/C} previous study' — error at A (data→the data, specific data mentioned).",

    56: "Incorrect preposition in idiom. Generate sentence with prepositional idiom. Place error: use wrong preposition. Example: 'Scientists are interested {A}on{/A} the effects {B}of{/B} climate {C}change{/C}' — error at A (on→in, idiom is 'interested in').",

    57: "Omitted preposition. Generate sentence requiring preposition. Place error: omit necessary preposition. Example: 'Researchers {A}listened{/A} the recordings {B}carefully{/B} {C}before{/C} analysis' — error at A (listened→listened to).",

    58: "Make vs Do confusion. Generate sentence with make/do collocation. Place error: use wrong verb. Example: 'The team {A}made{/A} extensive research {B}on{/B} the {C}topic{/C}' — error at A (made→did / conducted, collocation is 'do research').",

    59: "Like vs Alike vs Unlike. Generate sentence with comparison. Place error: use 'like' as adjective, 'alike' with noun, or 'unlike' without noun. Example: 'The two studies are {A}like{/A} in {B}their{/B} methodology {C}and{/C} findings' — error at A (like→alike, 'alike' is adjective).",

    60: "Other/Another/Others. Generate sentence with other/another/others. Place error: use 'another' with plural, 'other' with singular countable, or 'others' with noun. Example: 'Some experiments succeeded, but {A}another{/A} {B}experiments{/B} failed {C}due to{/C} contamination' — error at A (another→other, 'experiments' is plural)."
};

