#Setup
library(rmarkdown)
library(knitr)
library(dplyr)

setwd("~/Documents/yurilavinas.github.io/")

# #Execute
# render_site(input = "index.Rmd")
render_site(input = "publications.Rmd")
# render_site(input = "calendar.Rmd")
# render_site(input = "blog.Rmd")
# render_site(input = "my_blog/visuals.Rmd")



