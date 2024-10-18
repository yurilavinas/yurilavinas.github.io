#Setup
library(rmarkdown)
library(knitr)
# library(render_site)
library(dplyr)

setwd("~/Documents/yurilavinas.github.io/")
# rmarkdown::render('publications.Rmd', 'html_document')

# knitr::opts_chunk$set(echo = TRUE, include = TRUE, cache=T, fig.width = 8, fig.height=6, fig.align="center", background = c(.95,.95,.95),message=FALSE)
# 
# #Execute
render_site(input = "index.Rmd")
# render_site(input = "publications.Rmd")



