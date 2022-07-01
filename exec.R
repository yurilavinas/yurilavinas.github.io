#Setup
library(rmarkdown)
library(knitr)
library(render_site {rmarkdown} {rmarkdown}	)
library(dplyr)

# setwd("~/Documents/estudos/webpage/")
rmarkdown::render('publications.Rmd', 'html_document')

knitr::opts_chunk$set(echo = TRUE, include = TRUE, cache=T, fig.width = 8, fig.height=6, fig.align="center", background = c(.95,.95,.95),message=FALSE)

#Execute
render_site(input = "publications.Rmd")


beep()  #finished rendering

