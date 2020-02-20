library(ChocoLattes)

my.aliases <- list(c("Yuri Cossich Lavinas",
                     "Y. Lavinas",
                     "Yuri Lavinas"))
lattes.list <- lattes_to_list(CV.dir         = "./papers/",
                              author.aliases = my.aliases)

make_productions_page(lattes.list, chart.type = "rCharts",
                      chart.width = 960, chart.height = 480, 
                      h1.title = "Yuri Lavinas", 
                      chart.type  = "ggplot2",
                      h2.title = "University of Tsukuba", language = "EN", 
                      which.fields = c("journal.accepted", "journal.published", 
                                       "conference.international", "conference.national", "book.chapters", 
                                       "books", "phd.theses", "msc.theses")) 

lattes.list <- readRDS('./lattes_list.tmp')
Prod.Years <- lapply(lattes.list, FUN = function(x){unique(x$Year)})
years <- sort(unique(unlist(Prod.Years)), decreasing = TRUE)
language <- 'EN'
make_productions_page(lattes.list = lattes.list,
                      chart.type  = "ggplot2",
                      h2.title    = "University of Tsukuba",
                      language    = language)